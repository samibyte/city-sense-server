import type {
	AssignmentStatus,
	Priority,
	RequestStatus,
	ResolverVerificationStatus,
} from "../../../generated/prisma/enums.js";

export interface IApplyAsResolverPayload {
	user: {
		name: string;
		email: string;
		phone?: string;
		address?: string;
	};
	resolver: {
		bio?: string;
		departmentId: string;
	};
}

export interface IReviewApplicationPayload {
	resolverId: string;
	verificationStatus: "APPROVED" | "REJECTED";
	rejectionReason?: string;
}

export interface IGetApplicationsQuery {
	page?: number;
	limit?: number;
	status?: ResolverVerificationStatus;
	departmentId?: string;
}

export interface IGetAssignmentsQuery {
	page?: number;
	limit?: number;
	status?: AssignmentStatus;
	priority?: Priority;
}

export interface IRejectAssignmentPayload {
	rejectedReason: string;
}

export interface IUpdateAssignmentStatusPayload {
	status: AssignmentStatus;
	requestStatus?: RequestStatus;
	notes?: string;
}
