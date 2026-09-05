import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { departmentService } from "./department.service";

const getAllDepartment = catchAsync(async (_req: Request, res: Response) => {
	const result = await departmentService.getAllDepartment();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Departments retrieved successfully",
		data: result,
	});
});

export const departmentController = {
	getAllDepartment,
};
