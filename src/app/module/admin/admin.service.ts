import httpStatus from "http-status";
import {
	AssignmentStatus,
	RequestStatus,
	ResolverVerificationStatus,
	Role,
	type UserStatus,
} from "../../../generated/prisma/enums.js";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import type {
	IAssignRequestPayload,
	IGetRequestsAdminQuery,
	IGetUsersAdminQuery,
	IReassignRequestPayload,
	IUpdateRequestStatusAdminPayload,
} from "./admin.interface.js";

interface IGetAvailableResolversQuery {
	departmentId?: string;
	city?: string;
	page?: string;
	limit?: string;
}

const getAllRequests = async (query: IGetRequestsAdminQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {};

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

	if (query.departmentId) {
		where.category = {
			departmentId: query.departmentId,
		};
	}

	if (query.resolverId) {
		where.assignedResolverId = query.resolverId;
	}

	if (query.search) {
		where.OR = [
			{ title: { contains: query.search, mode: "insensitive" } },
			{ requestNumber: { contains: query.search, mode: "insensitive" } },
			{ description: { contains: query.search, mode: "insensitive" } },
		];
	}

	const [requests, total] = await Promise.all([
		prisma.request.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				category: {
					include: {
						department: true,
					},
				},
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
					take: 1,
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
							},
						},
					},
				},
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

const assignRequest = async (
	adminUserId: string,
	payload: IAssignRequestPayload,
) => {
	const request = await prisma.request.findUnique({
		where: { id: payload.requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (
		request.status !== RequestStatus.SUBMITTED &&
		request.status !== RequestStatus.REJECTED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot assign request in ${request.status.toLowerCase()} status`,
		);
	}

	const resolver = await prisma.resolverProfile.findUnique({
		where: { id: payload.resolverId },
		include: { user: true },
	});

	if (!resolver) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolver not found");
	}

	if (
		resolver.verificationStatus !== ResolverVerificationStatus.APPROVED ||
		resolver.isDeleted
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolver is not approved or is inactive",
		);
	}

	const priority = payload.priority ?? request.priority;

	const [assignment] = await prisma.$transaction([
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.PENDING,
				priority,
				requestId: payload.requestId,
				resolverId: payload.resolverId,
				assignedByAdminId: adminUserId,
				assignedAt: new Date(),
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
		}),
		prisma.request.update({
			where: { id: payload.requestId },
			data: {
				status: RequestStatus.ASSIGNED,
				assignedResolverId: payload.resolverId,
				assignedByAdminId: adminUserId,
				assignedAt: new Date(),
				priority,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId: payload.requestId,
				status: RequestStatus.ASSIGNED,
				previousStatus: request.status,
				notes: `Assigned to ${resolver.user.name} by admin`,
				changedByUserId: adminUserId,
			},
		}),
	]);

	return assignment;
};

const reassignRequest = async (
	adminUserId: string,
	payload: IReassignRequestPayload,
) => {
	const request = await prisma.request.findUnique({
		where: { id: payload.requestId },
		include: {
			assignments: {
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	const newResolver = await prisma.resolverProfile.findUnique({
		where: { id: payload.newResolverId },
		include: { user: true },
	});

	if (!newResolver) {
		throw new AppError(httpStatus.NOT_FOUND, "New resolver not found");
	}

	if (
		newResolver.verificationStatus !== ResolverVerificationStatus.APPROVED ||
		newResolver.isDeleted
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolver is not approved or is inactive",
		);
	}

	const activeAssignment = request.assignments.find(
		(a: any) =>
			a.status === AssignmentStatus.PENDING ||
			a.status === AssignmentStatus.ACCEPTED ||
			a.status === AssignmentStatus.IN_PROGRESS,
	);

	const priority = payload.priority ?? request.priority;

	const [newAssignment] = await prisma.$transaction([
		...(activeAssignment
			? [
					prisma.assignment.update({
						where: { id: activeAssignment.id },
						data: {
							status: AssignmentStatus.REASSIGNED,
						},
					}),
				]
			: []),
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.PENDING,
				priority,
				requestId: payload.requestId,
				resolverId: payload.newResolverId,
				assignedByAdminId: adminUserId,
				reassignedByAdminId: adminUserId,
				previousAssignmentId: activeAssignment?.id,
				assignedAt: new Date(),
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
		}),
		prisma.request.update({
			where: { id: payload.requestId },
			data: {
				status: RequestStatus.ASSIGNED,
				assignedResolverId: payload.newResolverId,
				assignedByAdminId: adminUserId,
				assignedAt: new Date(),
				priority,
			},
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId: payload.requestId,
				status: RequestStatus.ASSIGNED,
				previousStatus: request.status,
				notes:
					payload.reason ?? `Reassigned to ${newResolver.user.name} by admin`,
				changedByUserId: adminUserId,
			},
		}),
	]);

	return newAssignment;
};

const updateRequestStatus = async (
	adminUserId: string,
	requestId: string,
	payload: IUpdateRequestStatusAdminPayload,
) => {
	const request = await prisma.request.findUnique({
		where: { id: requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	const updateData: Record<string, unknown> = {
		status: payload.status,
	};

	if (payload.status === RequestStatus.RESOLVED) {
		updateData.resolvedAt = new Date();
	}

	if (payload.status === RequestStatus.COMPLETED) {
		updateData.completedAt = new Date();
	}

	if (payload.slaDeadline) {
		updateData.slaDeadline = new Date(payload.slaDeadline);
	}

	const [updatedRequest] = await prisma.$transaction([
		prisma.request.update({
			where: { id: requestId },
			data: updateData,
		}),
		prisma.requestStatusHistory.create({
			data: {
				requestId,
				status: payload.status,
				previousStatus: request.status,
				notes: payload.notes ?? `Status updated to ${payload.status} by admin`,
				changedByUserId: adminUserId,
			},
		}),
	]);

	return updatedRequest;
};

const getAllUsers = async (query: IGetUsersAdminQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		isDeleted: false,
	};

	if (query.role) {
		where.role = query.role;
	}

	if (query.status) {
		where.status = query.status;
	}

	if (query.search) {
		where.OR = [
			{ name: { contains: query.search, mode: "insensitive" } },
			{ email: { contains: query.search, mode: "insensitive" } },
			{ phone: { contains: query.search, mode: "insensitive" } },
		];
	}

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			omit: { passwordHash: true },
			include: {
				citizen: true,
				resolver: {
					include: {
						department: true,
					},
				},
			},
		}),
		prisma.user.count({ where }),
	]);

	return {
		users,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const updateUserStatus = async (userId: string, status: UserStatus) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { status },
		omit: { passwordHash: true },
	});

	return updated;
};

const getDashboardStats = async () => {
	const [
		totalRequests,
		submittedRequests,
		assignedRequests,
		inProgressRequests,
		resolvedRequests,
		completedRequests,
		totalUsers,
		totalCitizens,
		totalResolvers,
		totalDepartments,
		totalServices,
	] = await Promise.all([
		prisma.request.count(),
		prisma.request.count({ where: { status: RequestStatus.SUBMITTED } }),
		prisma.request.count({ where: { status: RequestStatus.ASSIGNED } }),
		prisma.request.count({ where: { status: RequestStatus.IN_PROGRESS } }),
		prisma.request.count({ where: { status: RequestStatus.RESOLVED } }),
		prisma.request.count({ where: { status: RequestStatus.COMPLETED } }),
		prisma.user.count({ where: { isDeleted: false } }),
		prisma.user.count({ where: { role: Role.CITIZEN, isDeleted: false } }),
		prisma.resolverProfile.count({
			where: {
				verificationStatus: ResolverVerificationStatus.APPROVED,
				isDeleted: false,
			},
		}),
		prisma.department.count(),
		prisma.service.count({ where: { isDeleted: false } }),
	]);

	return {
		requests: {
			total: totalRequests,
			submitted: submittedRequests,
			assigned: assignedRequests,
			inProgress: inProgressRequests,
			resolved: resolvedRequests,
			completed: completedRequests,
		},
		users: {
			total: totalUsers,
			citizens: totalCitizens,
			resolvers: totalResolvers,
		},
		departments: totalDepartments,
		services: totalServices,
	};
};

const getAvailableResolvers = async (query: IGetAvailableResolversQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		verificationStatus: ResolverVerificationStatus.APPROVED,
		isDeleted: false,
	};

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.city) {
		where.city = query.city;
	}

	const [resolvers, total] = await Promise.all([
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
					},
				},
				department: true,
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
		}),
		prisma.resolverProfile.count({ where }),
	]);

	const result = resolvers.map((resolver) => ({
		id: resolver.id,
		city: resolver.city,
		area: resolver.area,
		maxConcurrentAssignments: resolver.maxConcurrentAssignments,
		activeAssignments: resolver.assignments.length,
		isAvailable:
			resolver.assignments.length < resolver.maxConcurrentAssignments,
		user: resolver.user,
		department: resolver.department,
	}));

	return {
		resolvers: result,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const adminService = {
	getAllRequests,
	assignRequest,
	reassignRequest,
	updateRequestStatus,
	getAllUsers,
	updateUserStatus,
	getDashboardStats,
	getAvailableResolvers,
};
