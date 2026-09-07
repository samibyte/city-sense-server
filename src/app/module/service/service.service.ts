import httpStatus from "http-status";
import { ServiceType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import type {
	ICreateServiceCategoryPayload,
	ICreateServicePayload,
	IGetCategoriesQuery,
	IGetServicesQuery,
	IUpdateServiceCategoryPayload,
	IUpdateServicePayload,
} from "./service.interface";

const createService = async (payload: ICreateServicePayload) => {
	const department = await prisma.department.findUnique({
		where: { id: payload.departmentId },
	});
	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	const category = await prisma.serviceCategory.findUnique({
		where: { id: payload.categoryId },
	});
	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
	}

	const isPaid = payload.serviceType === ServiceType.PAID || payload.price > 0;
	const serviceType =
		payload.serviceType ??
		(payload.price > 0 ? ServiceType.PAID : ServiceType.FREE);

	const service = await prisma.service.create({
		data: {
			name: payload.name,
			description: payload.description,
			price: payload.price,
			estimatedDuration: payload.estimatedDuration,
			isPaid,
			serviceType,
			departmentId: payload.departmentId,
			categoryId: payload.categoryId,
		},
		include: {
			department: true,
			category: true,
		},
	});

	return service;
};

const getAllServices = async (query: IGetServicesQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		isDeleted: false,
	};

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.categoryId) {
		where.categoryId = query.categoryId;
	}

	if (query.serviceType) {
		where.serviceType = query.serviceType;
	}

	if (query.search) {
		where.OR = [
			{ name: { contains: query.search, mode: "insensitive" } },
			{ description: { contains: query.search, mode: "insensitive" } },
		];
	}

	const [services, total] = await Promise.all([
		prisma.service.findMany({
			where,
			skip,
			take: limit,
			orderBy: { name: "asc" },
			include: {
				department: true,
				category: true,
			},
		}),
		prisma.service.count({ where }),
	]);

	return {
		services,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getServiceById = async (id: string) => {
	const service = await prisma.service.findUnique({
		where: { id },
		include: {
			department: true,
			category: true,
		},
	});

	if (!service || service.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Service not found");
	}

	return service;
};

const updateService = async (id: string, payload: IUpdateServicePayload) => {
	const service = await prisma.service.findUnique({
		where: { id },
	});

	if (!service || service.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Service not found");
	}

	if (payload.departmentId) {
		const department = await prisma.department.findUnique({
			where: { id: payload.departmentId },
		});
		if (!department) {
			throw new AppError(httpStatus.NOT_FOUND, "Department not found");
		}
	}

	if (payload.categoryId) {
		const category = await prisma.serviceCategory.findUnique({
			where: { id: payload.categoryId },
		});
		if (!category) {
			throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
		}
	}

	const updateData: Record<string, unknown> = { ...payload };

	if (payload.serviceType !== undefined || payload.price !== undefined) {
		const price = payload.price ?? Number(service.price);
		const serviceType = payload.serviceType ?? service.serviceType;
		updateData.isPaid = serviceType === ServiceType.PAID || price > 0;
	}

	const updated = await prisma.service.update({
		where: { id },
		data: updateData,
		include: {
			department: true,
			category: true,
		},
	});

	return updated;
};

const deleteService = async (id: string) => {
	const service = await prisma.service.findUnique({
		where: { id },
	});

	if (!service || service.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Service not found");
	}

	return prisma.service.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});
};

const createCategory = async (payload: ICreateServiceCategoryPayload) => {
	const department = await prisma.department.findUnique({
		where: { id: payload.departmentId },
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return prisma.serviceCategory.create({
		data: payload,
		include: {
			department: true,
		},
	});
};

const getAllCategories = async (query: IGetCategoriesQuery) => {
	const where: Record<string, unknown> = {};

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.search) {
		where.OR = [
			{ name: { contains: query.search, mode: "insensitive" } },
			{ description: { contains: query.search, mode: "insensitive" } },
		];
	}

	return prisma.serviceCategory.findMany({
		where,
		orderBy: { name: "asc" },
		include: {
			department: true,
			services: {
				where: { isDeleted: false },
				orderBy: { name: "asc" },
			},
		},
	});
};

const getCategoryById = async (id: string) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
		include: {
			department: true,
			services: {
				where: { isDeleted: false },
				orderBy: { name: "asc" },
			},
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
	}

	return category;
};

const updateCategory = async (
	id: string,
	payload: IUpdateServiceCategoryPayload,
) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
	}

	if (payload.departmentId) {
		const department = await prisma.department.findUnique({
			where: { id: payload.departmentId },
		});
		if (!department) {
			throw new AppError(httpStatus.NOT_FOUND, "Department not found");
		}
	}

	return prisma.serviceCategory.update({
		where: { id },
		data: payload,
		include: {
			department: true,
		},
	});
};

const deleteCategory = async (id: string) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
		include: {
			services: {
				where: { isDeleted: false },
			},
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Service category not found");
	}

	if (category.services.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete category with active services",
		);
	}

	return prisma.serviceCategory.delete({
		where: { id },
	});
};

export const serviceService = {
	createService,
	getAllServices,
	getServiceById,
	updateService,
	deleteService,
	createCategory,
	getAllCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
