import type {
	Priority,
	RequestStatus,
	RequestType,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";

export interface IAssignRequestPayload {
	requestId: string;
	resolverId: string;
	priority?: Priority;
}

export interface IReassignRequestPayload {
	requestId: string;
	newResolverId: string;
	priority?: Priority;
	reason?: string;
}

export interface IUpdateRequestStatusAdminPayload {
	status: RequestStatus;
	notes?: string;
	slaDeadline?: Date;
}

export interface IGetRequestsAdminQuery {
	page?: number;
	limit?: number;
	status?: RequestStatus;
	type?: RequestType;
	priority?: Priority;
	categoryId?: string;
	departmentId?: string;
	resolverId?: string;
	search?: string;
}

export interface IGetUsersAdminQuery {
	page?: number;
	limit?: number;
	role?: Role;
	status?: UserStatus;
	search?: string;
}

export interface IUpdateUserStatusPayload {
	status: UserStatus;
}
