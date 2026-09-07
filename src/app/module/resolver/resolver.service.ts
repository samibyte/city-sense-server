import bcrypt from "bcrypt";
import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import crypto from "node:crypto";
import path from "node:path";
import {
	AssignmentStatus,
	AuthProvider,
	RequestStatus,
	ResolverVerificationStatus,
	Role,
} from "../../../generated/prisma/enums.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { cloudinary } from "../../lib/cloudinary.js";
import { transporter } from "../../lib/lib.js";
import { prisma } from "../../lib/prisma.js";
import type {
	IApplyAsResolverPayload,
	IGetApplicationsQuery,
	IGetAssignmentsQuery,
	IReviewApplicationPayload,
	IUpdateAssignmentStatusPayload,
} from "./resolver.interface.js";

const applyAsResolver = async (
	payload: IApplyAsResolverPayload,
	resume: Express.Multer.File | null,
	additionalFiles: Express.Multer.File[],
) => {
	if (!resume) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resume is required to submit a resolver application",
		);
	}

	const allowedMimeTypes = [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg",
		"image/png",
	];

	if (!allowedMimeTypes.includes(resume.mimetype)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resume must be a PDF, DOC, DOCX, JPG, or PNG file",
		);
	}

	if (resume.size > 5 * 1024 * 1024) {
		throw new AppError(httpStatus.BAD_REQUEST, "Resume must be less than 5MB");
	}

	if (additionalFiles.length > 10) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You can upload at most 10 supporting files",
		);
	}

	const userExists = await prisma.user.findByEmail(payload.user.email);

	if (userExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User Already Exists With This Email",
		);
	}

	const departmentExists = await prisma.department.findUnique({
		where: {
			id: payload.resolver.departmentId,
		},
	});
	if (!departmentExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "Department doesn't exist");
	}

	const resumeUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},

					async (error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result returned from Cloudinary",
								),
							);
						}

						resolve(result);
					},
				)
				.end(resume?.buffer);
		},
	);

	const additionalFilesUploadResults = await Promise.all(
		additionalFiles.map((file) => {
			return new Promise<UploadApiResponse>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{
							resource_type: "auto",
						},

						async (error, result) => {
							if (error) {
								return reject(error);
							}

							if (!result) {
								return reject(new Error("No result returned from Cloudinary"));
							}

							resolve(result);
						},
					)
					.end(file.buffer);
			});
		}),
	);

	const { address, ...userData } = payload.user;

	const resolverApplication = await prisma.user.create({
		data: {
			...userData,
			authProvider: AuthProvider.CREDENTIAL,
			role: Role.RESOLVER,
			needPasswordChange: true,
			resolver: {
				create: {
					...payload.resolver,
					resume: resumeUploadResult.secure_url,
					resumePublicId: resumeUploadResult.public_id,
					additionalFiles: additionalFilesUploadResults.map((file) => ({
						url: file.secure_url,
						publicId: file.public_id,
					})),
				},
			},
		},
		omit: {
			passwordHash: true,
			googleId: true,
			profileUrl: true,
			profilePublicId: true,
			deletedAt: true,
			isDeleted: true,
		},
		include: {
			resolver: {
				include: {
					department: true,
				},
			},
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/resolver-application.ejs",
	);

	const templateData = {
		name: payload.user.name,
		email: payload.user.email,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: payload.user.email,
		subject: "Your Resolver Application Is Under Review",
		html,
	});

	return resolverApplication;
};

const reviewApplication = async (
	payload: IReviewApplicationPayload,
	reviewerUser: { userId: string },
) => {
	const { resolverId, verificationStatus, rejectionReason } = payload;

	const resolverApplication = await prisma.resolverProfile.findUnique({
		where: { id: resolverId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	if (!resolverApplication) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver application not found");
	}

	if (
		resolverApplication.verificationStatus !==
		ResolverVerificationStatus.PENDING
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`This application has already been ${resolverApplication.verificationStatus.toLowerCase()}`,
		);
	}

	if (verificationStatus === ResolverVerificationStatus.APPROVED) {
		const generatedPassword = crypto.randomBytes(8).toString("hex");
		const hashedPassword = await bcrypt.hash(
			generatedPassword,
			Number(envVars.BCRYPT_SALT_ROUNDS),
		);

		const [, updatedApplication] = await prisma.$transaction([
			prisma.user.update({
				where: { id: resolverApplication.user.id },
				data: {
					passwordHash: hashedPassword,
					emailVerified: true,
					needPasswordChange: true,
				},
			}),
			prisma.resolverProfile.update({
				where: { id: resolverApplication.id },
				data: {
					verificationStatus: ResolverVerificationStatus.APPROVED,
					rejectionReason: null,
					reviewedBy: reviewerUser.userId,
					reviewedAt: new Date(),
				},
				select: {
					id: true,
					bio: true,
					resume: true,
					verificationStatus: true,
					departmentId: true,
					userId: true,
					reviewedBy: true,
					reviewedAt: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
		]);

		const templatePath = path.join(
			process.cwd(),
			"src/app/templates/resolver-approved.ejs",
		);

		const html = await ejs.renderFile(templatePath, {
			name: resolverApplication.user.name,
			email: resolverApplication.user.email,
			password: generatedPassword,
			year: new Date().getFullYear(),
		});

		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: resolverApplication.user.email,
			subject: "Your Resolver Application Has Been Approved",
			html,
		});

		return { ...updatedApplication, email: resolverApplication.user.email };
	}

	const updatedApplication = await prisma.resolverProfile.update({
		where: { id: resolverApplication.id },
		data: {
			verificationStatus: ResolverVerificationStatus.REJECTED,
			rejectionReason: rejectionReason ?? null,
			reviewedBy: reviewerUser.userId,
			reviewedAt: new Date(),
		},
		select: {
			id: true,
			bio: true,
			resume: true,
			verificationStatus: true,
			rejectionReason: true,
			departmentId: true,
			userId: true,
			reviewedBy: true,
			reviewedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/resolver-rejected.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: resolverApplication.user.name,
		rejectionReason: rejectionReason ?? "",
		year: new Date().getFullYear(),
	});

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: resolverApplication.user.email,
		subject: "Update on Your Resolver Application",
		html,
	});

	return { ...updatedApplication, email: resolverApplication.user.email };
};

const getAllApplications = async (query: IGetApplicationsQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		isDeleted: false,
	};

	if (query.status) {
		where.verificationStatus = query.status;
	}

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	const [applications, total] = await Promise.all([
		prisma.resolverProfile.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						profileUrl: true,
						status: true,
						createdAt: true,
					},
				},
				department: true,
			},
		}),
		prisma.resolverProfile.count({ where }),
	]);

	return {
		applications,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getApplicationById = async (id: string) => {
	const application = await prisma.resolverProfile.findUnique({
		where: { id },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					profileUrl: true,
					status: true,
					createdAt: true,
				},
			},
			department: true,
		},
	});

	if (!application) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver application not found");
	}

	return application;
};

const getMyAssignments = async (
	userId: string,
	query: IGetAssignmentsQuery,
) => {
	const resolver = await prisma.resolverProfile.findUnique({
		where: { userId },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver profile not found");
	}

	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		resolverId: resolver.id,
	};

	if (query.status) {
		where.status = query.status;
	}

	if (query.priority) {
		where.priority = query.priority;
	}

	const [assignments, total] = await Promise.all([
		prisma.assignment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				request: {
					include: {
						category: true,
						service: true,
						location: true,
						citizen: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
										phone: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		prisma.assignment.count({ where }),
	]);

	return {
		assignments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getAssignmentById = async (userId: string, assignmentId: string) => {
	const resolver = await prisma.resolverProfile.findUnique({
		where: { userId },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver profile not found");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: {
			request: {
				include: {
					category: true,
					service: true,
					location: true,
					statusHistory: {
						orderBy: { createdAt: "desc" },
						include: {
							changedBy: {
								select: {
									id: true,
									name: true,
									role: true,
								},
							},
						},
					},
					citizen: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									phone: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	if (assignment.resolverId !== resolver.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this request",
		);
	}

	return assignment;
};

const acceptAssignment = async (userId: string, assignmentId: string) => {
	const resolver = await prisma.resolverProfile.findUnique({
		where: { userId },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver profile not found");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { request: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	if (assignment.resolverId !== resolver.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this request",
		);
	}

	if (assignment.status !== AssignmentStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Assignment cannot be accepted because its status is ${assignment.status}`,
		);
	}

	const [updatedAssignment] = await prisma.$transaction([
		prisma.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.ACCEPTED,
				acceptedAt: new Date(),
			},
			include: {
				request: true,
			},
		}),
		prisma.request.update({
			where: { id: assignment.requestId },
			data: {
				status: RequestStatus.ACCEPTED,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId: assignment.requestId,
				status: RequestStatus.ACCEPTED,
				previousStatus: assignment.request.status,
				notes: "Assignment accepted by resolver",
				changedByUserId: userId,
			},
		}),
	]);

	return updatedAssignment;
};

const rejectAssignment = async (
	userId: string,
	assignmentId: string,
	rejectedReason: string,
) => {
	const resolver = await prisma.resolverProfile.findUnique({
		where: { userId },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver profile not found");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { request: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	if (assignment.resolverId !== resolver.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this request",
		);
	}

	if (assignment.status !== AssignmentStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Assignment cannot be rejected because its status is ${assignment.status}`,
		);
	}

	const [updatedAssignment] = await prisma.$transaction([
		prisma.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.REJECTED,
				rejectedAt: new Date(),
				rejectedReason,
			},
			include: {
				request: true,
			},
		}),
		prisma.request.update({
			where: { id: assignment.requestId },
			data: {
				status: RequestStatus.SUBMITTED,
				assignedResolverId: null,
				rejectReason: rejectedReason,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId: assignment.requestId,
				status: RequestStatus.SUBMITTED,
				previousStatus: assignment.request.status,
				notes: `Assignment rejected by resolver: ${rejectedReason}`,
				changedByUserId: userId,
			},
		}),
	]);

	return updatedAssignment;
};

const updateAssignmentStatus = async (
	userId: string,
	assignmentId: string,
	payload: IUpdateAssignmentStatusPayload,
) => {
	const resolver = await prisma.resolverProfile.findUnique({
		where: { userId },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver profile not found");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { request: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	if (assignment.resolverId !== resolver.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this request",
		);
	}

	let newRequestStatus: RequestStatus = assignment.request.status;
	const isCompleted = payload.status === AssignmentStatus.COMPLETED;

	if (payload.status === AssignmentStatus.IN_PROGRESS) {
		newRequestStatus = RequestStatus.IN_PROGRESS;
	} else if (isCompleted) {
		newRequestStatus = RequestStatus.RESOLVED;
	}

	const [updatedAssignment] = await prisma.$transaction([
		prisma.assignment.update({
			where: { id: assignment.id },
			data: {
				status: payload.status,
				...(isCompleted && { completedAt: new Date() }),
			},
			include: {
				request: true,
			},
		}),
		prisma.request.update({
			where: { id: assignment.requestId },
			data: {
				status: newRequestStatus,
				...(isCompleted && { resolvedAt: new Date() }),
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId: assignment.requestId,
				status: newRequestStatus,
				previousStatus: assignment.request.status,
				notes:
					payload.notes ?? `Assignment status updated to ${payload.status}`,
				changedByUserId: userId,
			},
		}),
	]);

	return updatedAssignment;
};

export const resolverService = {
	applyAsResolver,
	reviewApplication,
	getAllApplications,
	getApplicationById,
	getMyAssignments,
	getAssignmentById,
	acceptAssignment,
	rejectAssignment,
	updateAssignmentStatus,
};
