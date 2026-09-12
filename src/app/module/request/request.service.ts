import crypto from "node:crypto";
import httpStatus from "http-status";
import {
	PaymentStatus,
	RequestStatus,
	Role,
} from "../../../generated/prisma/enums.js";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import { assignmentService } from "../assignment/assignment.service.js";
import type {
	ICreateFeedbackPayload,
	ICreateRequestPayload,
	IGetMyRequestsQuery,
} from "./request.interface.js";

const createRequest = async (
	userId: string,
	payload: ICreateRequestPayload,
	files: Express.Multer.File[],
) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const category = await prisma.serviceCategory.findUnique({
		where: { id: payload.categoryId },
	});

	if (!category || category.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
	}

	let service: { isPaid: boolean; isDeleted: boolean } | null = null;
	if (payload.serviceId) {
		service = await prisma.service.findUnique({
			where: { id: payload.serviceId },
		});
		if (!service || service.isDeleted) {
			throw new AppError(httpStatus.NOT_FOUND, "Service not found");
		}
	}

	const isPaidRequest = service?.isPaid ?? false;

	let attachments: Array<{ url: string; publicId: string }> = [];
	if (files && files.length > 0) {
		const uploadPromises = files.map((file) =>
			uploadToCloudinary(file.buffer, { resource_type: "auto" }),
		);
		const uploadResults = await Promise.all(uploadPromises);
		attachments = uploadResults.map((result) => ({
			url: result.secure_url,
			publicId: result.public_id,
		}));
	}

	const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
	const requestNumber = `REQ-${Date.now()}-${randomSuffix}`;

	const location = await prisma.location.create({
		data: payload.location,
	});

	const initialStatus = isPaidRequest
		? RequestStatus.PENDING
		: RequestStatus.SUBMITTED;

	const request = await prisma.request.create({
		data: {
			requestNumber,
			type: payload.type,
			title: payload.title,
			description: payload.description,
			requestAttachment: attachments.length > 0 ? attachments : undefined,
			status: initialStatus,
			citizenId: citizen.id,
			categoryId: payload.categoryId,
			serviceId: payload.serviceId,
			locationId: location.id,
			statusHistory: {
				create: {
					status: initialStatus,
					notes: isPaidRequest
						? "Request created, awaiting payment"
						: "Request submitted by citizen",
					changedByUserId: userId,
				},
			},
		},
		include: {
			category: true,
			service: true,
			location: true,
			statusHistory: {
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!isPaidRequest) {
		assignmentService.assignNextResolver(request.id).catch((error) => {
			console.error(`Auto-assignment failed for request ${request.id}:`, error);
		});
	}

	return request;
};

const getMyRequests = async (userId: string, query: IGetMyRequestsQuery) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		citizenId: citizen.id,
	};

	if (query.status) {
		where.status = query.status;
	}

	if (query.type) {
		where.type = query.type;
	}

	if (query.priority) {
		where.priority = query.priority;
	}

	if (query.categoryId) {
		where.categoryId = query.categoryId;
	}

	const [requests, total] = await Promise.all([
		prisma.request.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				category: true,
				service: true,
				location: true,
				feedback: true,
			},
		}),
		prisma.request.count({ where }),
	]);

	return {
		requests,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getRequestById = async (
	userId: string,
	userRole: Role,
	requestId: string,
) => {
	const request = await prisma.request.findUnique({
		where: { id: requestId },
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
			assignments: {
				orderBy: { createdAt: "desc" },
				include: {
					resolver: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									phone: true,
								},
							},
							department: true,
						},
					},
				},
			},
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
			feedback: true,
			payment: true,
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (userRole === Role.CITIZEN && request.citizen.userId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this request",
		);
	}

	return request;
};

const cancelRequest = async (userId: string, requestId: string) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const request = await prisma.request.findUnique({
		where: { id: requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only cancel your own requests",
		);
	}

	if (
		request.status !== RequestStatus.SUBMITTED &&
		request.status !== RequestStatus.PENDING
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot cancel request because it is already ${request.status.toLowerCase()}`,
		);
	}

	if (request.status === RequestStatus.PENDING) {
		const payment = await prisma.payment.findUnique({
			where: { requestId: requestId },
		});

		if (payment?.status === PaymentStatus.PAID) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Cannot cancel a request that has already been paid",
			);
		}

		const sessionId = payment?.transactionId;
		if (sessionId && !sessionId.startsWith("TEMP-")) {
			try {
				await stripe.checkout.sessions.expire(sessionId);
			} catch (error) {
				console.error(`Failed to expire checkout session ${sessionId}:`, error);
			}
		}
	}

	const [updatedRequest] = await prisma.$transaction([
		prisma.request.update({
			where: { id: requestId },
			data: {
				status: RequestStatus.CANCELLED,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId,
				status: RequestStatus.CANCELLED,
				previousStatus: request.status,
				notes: "Request cancelled by citizen",
				changedByUserId: userId,
			},
		}),
	]);

	return updatedRequest;
};

const giveFeedback = async (
	userId: string,
	requestId: string,
	payload: ICreateFeedbackPayload,
) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const request = await prisma.request.findUnique({
		where: { id: requestId },
		include: { feedback: true },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only give feedback for your own requests",
		);
	}

	if (
		request.status !== RequestStatus.RESOLVED &&
		request.status !== RequestStatus.COMPLETED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Feedback can only be given for resolved or completed requests",
		);
	}

	if (!request.assignedResolverId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"No resolver is assigned to this request",
		);
	}

	if (request.feedback) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Feedback has already been submitted for this request",
		);
	}

	const feedback = await prisma.feedback.create({
		data: {
			rating: payload.rating,
			comment: payload.comment,
			requestId: request.id,
			citizenId: citizen.id,
			resolverId: request.assignedResolverId,
		},
		include: {
			resolver: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			},
		},
	});

	return feedback;
};

const confirmCompletion = async (userId: string, requestId: string) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const request = await prisma.request.findUnique({
		where: { id: requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only confirm completion for your own requests",
		);
	}

	if (request.status !== RequestStatus.RESOLVED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot confirm completion. Request status is ${request.status.toLowerCase()}`,
		);
	}

	const [updatedRequest] = await prisma.$transaction([
		prisma.request.update({
			where: { id: requestId },
			data: {
				status: RequestStatus.COMPLETED,
				completedAt: new Date(),
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId,
				status: RequestStatus.COMPLETED,
				previousStatus: request.status,
				notes: "Request completion confirmed by citizen",
				changedByUserId: userId,
			},
		}),
	]);

	return updatedRequest;
};

export const requestService = {
	createRequest,
	getMyRequests,
	getRequestById,
	cancelRequest,
	giveFeedback,
	confirmCompletion,
};
