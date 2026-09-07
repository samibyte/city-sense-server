import type { ServiceType } from "../../../generated/prisma/enums.js";

export interface ICreateServicePayload {
	name: string;
	description: string;
	price: number;
	estimatedDuration?: number;
	serviceType?: ServiceType;
	departmentId: string;
	categoryId: string;
}

export interface IUpdateServicePayload {
	name?: string;
	description?: string;
	price?: number;
	estimatedDuration?: number;
	serviceType?: ServiceType;
	departmentId?: string;
	categoryId?: string;
}

export interface IGetServicesQuery {
	page?: number;
	limit?: number;
	departmentId?: string;
	categoryId?: string;
	serviceType?: ServiceType;
	search?: string;
}

export interface ICreateServiceCategoryPayload {
	name: string;
	description: string;
	departmentId: string;
}

export interface IUpdateServiceCategoryPayload {
	name?: string;
	description?: string;
	departmentId?: string;
}

export interface IGetCategoriesQuery {
	departmentId?: string;
	search?: string;
}
