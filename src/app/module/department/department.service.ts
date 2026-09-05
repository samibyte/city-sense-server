import { prisma } from "../../lib/prisma";

const getAllDepartment = async () => {
	const departments = await prisma.department.findMany({
		orderBy: {
			name: "asc",
		},
	});

	return departments;
};

export const departmentService = {
	getAllDepartment,
};
