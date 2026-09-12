import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const getAllDepartment = async () => {
	const departments = await prisma.department.findMany({
		where: { isDeleted: false },
		orderBy: { name: "asc" },
	});

	return departments;
};

const getDepartmentById = async (id: string) => {
	const department = await prisma.department.findUnique({
		where: { id },
		include: {
			categories: {
				where: { isDeleted: false },
				orderBy: { name: "asc" },
			},
			services: {
				where: { isDeleted: false },
				orderBy: { name: "asc" },
				include: { category: true },
			},
		},
	});

	if (!department || department.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const createDepartment = async (payload: {
	name: string;
	description: string;
}) => {
	const department = await prisma.department.create({ data: payload });
	return department;
};

const updateDepartment = async (
	id: string,
	payload: { name?: string; description?: string },
) => {
	const existing = await prisma.department.findUnique({ where: { id } });
	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return prisma.department.update({ where: { id }, data: payload });
};

const deleteDepartment = async (id: string) => {
	const existing = await prisma.department.findUnique({
		where: { id },
		include: { services: { where: { isDeleted: false } } },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (existing.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (existing.services.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete department with active services",
		);
	}

	return prisma.department.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});
};

export const departmentService = {
	getAllDepartment,
	getDepartmentById,
	createDepartment,
	updateDepartment,
	deleteDepartment,
};
