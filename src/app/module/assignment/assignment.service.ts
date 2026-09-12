import path from "node:path";
import ejs from "ejs";
import httpStatus from "http-status";
import {
	AssignmentStatus,
	RequestStatus,
	ResolverVerificationStatus,
} from "../../../generated/prisma/enums.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { transporter } from "../../lib/lib.js";
import { prisma } from "../../lib/prisma.js";

const MAX_REJECTIONS = 3;

const findBestResolver = async (requestId: string) => {
	const request = await prisma.request.findUnique({
		where: { id: requestId },
		include: {
			category: {
				include: { department: true },
			},
			location: true,
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	const departmentId = request.category.departmentId;
	const city = request.location.city;

	const resolvers = await prisma.resolverProfile.findMany({
		where: {
			departmentId,
			city,
			verificationStatus: ResolverVerificationStatus.APPROVED,
			isDeleted: false,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			assignments: {
				where: {
					status: {
						in: [
							AssignmentStatus.PENDING,
							AssignmentStatus.ACCEPTED,
							AssignmentStatus.IN_PROGRESS,
						],
					},
				},
				select: { id: true },
			},
		},
	});

	const rejectedResolverIds = await prisma.assignment.findMany({
		where: {
			requestId,
			status: AssignmentStatus.REJECTED,
		},
		select: { resolverId: true },
	});

	const rejectedIds = new Set(rejectedResolverIds.map((r) => r.resolverId));

	const available = resolvers
		.filter((r) => !rejectedIds.has(r.id))
		.filter((r) => r.assignments.length < r.maxConcurrentAssignments)
		.sort((a, b) => a.assignments.length - b.assignments.length);

	return { request, bestResolver: available[0] ?? null };
};

const sendResolverAssignedEmail = async (
	resolverName: string,
	resolverEmail: string,
	requestNumber: string,
	requestTitle: string,
	citizenName: string,
	location: string,
) => {
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/resolver-assigned.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: resolverName,
		requestNumber,
		requestTitle,
		citizenName,
		location,
		year: new Date().getFullYear(),
	});

	try {
		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: resolverEmail,
			subject: `New Assignment Request: ${requestNumber}`,
			html,
		});
	} catch (error) {
		console.error("Failed to send resolver assignment email:", error);
	}
};

const sendCitizenAssignedEmail = async (
	citizenName: string,
	citizenEmail: string,
	requestNumber: string,
	requestTitle: string,
	resolverName: string,
) => {
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/citizen-request-assigned.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: citizenName,
		requestNumber,
		requestTitle,
		resolverName,
		year: new Date().getFullYear(),
	});

	try {
		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: citizenEmail,
			subject: `Resolver Assigned to Your Request: ${requestNumber}`,
			html,
		});
	} catch (error) {
		console.error("Failed to send citizen assignment email:", error);
	}
};

const assignNextResolver = async (requestId: string) => {
	const { request, bestResolver } = await findBestResolver(requestId);

	const citizen = await prisma.citizenProfile.findUnique({
		where: { id: request.citizenId },
		include: {
			user: {
				select: { id: true, name: true, email: true },
			},
		},
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const citizenUserId = citizen.user.id;

	if (!bestResolver) {
		const newCount = request.rejectionCount + 1;

		if (newCount >= MAX_REJECTIONS) {
			await prisma.request.update({
				where: { id: requestId },
				data: {
					rejectionCount: newCount,
					status: RequestStatus.SUBMITTED,
				},
			});

			await prisma.requestStatusHistory.create({
				data: {
					requestId,
					status: RequestStatus.SUBMITTED,
					previousStatus: request.status,
					notes: `Request rejected ${newCount} times. Flagged for admin review.`,
					changedByUserId: citizenUserId,
				},
			});
		} else {
			await prisma.request.update({
				where: { id: requestId },
				data: { rejectionCount: newCount },
			});
		}

		return null;
	}

	const location = `${request.location.area ? `${request.location.area}, ` : ""}${request.location.city}`;

	const [assignment] = await prisma.$transaction([
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.PENDING,
				priority: request.priority,
				requestId,
				resolverId: bestResolver.id,
				assignedAt: new Date(),
			},
			include: {
				resolver: {
					include: {
						user: {
							select: { id: true, name: true, email: true },
						},
					},
				},
			},
		}),
		prisma.request.update({
			where: { id: requestId },
			data: {
				status: RequestStatus.ASSIGNED,
				assignedResolverId: bestResolver.id,
				assignedAt: new Date(),
				autoAssigned: true,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId,
				status: RequestStatus.ASSIGNED,
				previousStatus: request.status,
				notes: `Auto-assigned to ${bestResolver.user.name}`,
				changedByUserId: citizenUserId,
			},
		}),
	]);

	await Promise.all([
		sendResolverAssignedEmail(
			bestResolver.user.name,
			bestResolver.user.email,
			request.requestNumber,
			request.title,
			citizen.user.name,
			location,
		),
		sendCitizenAssignedEmail(
			citizen.user.name,
			citizen.user.email,
			request.requestNumber,
			request.title,
			bestResolver.user.name,
		),
	]);

	return assignment;
};

export const assignmentService = {
	assignNextResolver,
	findBestResolver,
};
