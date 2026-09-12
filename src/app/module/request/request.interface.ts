import type {
	Priority,
	RequestStatus,
	RequestType,
} from "../../../generated/prisma/enums.js";

export interface ICreateRequestPayload {
	type: RequestType;
	title: string;
	description: string;
	categoryId: string;
	serviceId?: string;
	location: {
		address: string;
		latitude?: string;
		longitude?: string;
		area: string;
		city: string;
	};
}

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
