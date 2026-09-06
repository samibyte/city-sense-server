import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { departmentService } from "./department.service";

const getAllDepartment = catchAsync(async (req: Request, res: Response) => {
	const includeRelations = req.query.includeRelations !== "false";
	const result = await departmentService.getAllDepartment(includeRelations);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Departments retrieved successfully",
		data: result,
	});
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
	const result = await departmentService.getDepartmentById(
		req.params.id as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Department retrieved successfully",
		data: result,
	});
});

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await departmentService.createDepartment(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: "Department created successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await departmentService.updateDepartment(
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Department updated successfully",
		data: result,
	});
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await departmentService.deleteDepartment(
		req.params.id as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Department deleted successfully",
		data: result,
	});
});

export const departmentController = {
	getAllDepartment,
	getDepartmentById,
	createDepartment,
	updateDepartment,
	deleteDepartment,
};
