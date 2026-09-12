import type {
	Priority,
	RequestStatus,
	RequestType,
} from "../../../generated/prisma/enums.js";

interface IBaseLocation {
	address: string;
	latitude?: string;
	longitude?: string;
	area: string;
	city: string;
}

export interface IComplaintRequestPayload {
	type: "COMPLAINT";
	title: string;
	description: string;
	categoryId: string;
	serviceId?: string;
	location: IBaseLocation;
}

export interface IServiceRequestPayload {
	type: "SERVICE_REQUEST";
	serviceId: string;
	location: IBaseLocation;
}

export type ICreateRequestPayload =
	| IComplaintRequestPayload
	| IServiceRequestPayload;

export interface IGetMyRequestsQuery {
	page?: number;
	limit?: number;
	status?: RequestStatus;
	type?: RequestType;
	priority?: Priority;
	categoryId?: string;
}

export interface ICreateFeedbackPayload {
	rating: number;
	comment?: string;
}
