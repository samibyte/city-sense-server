import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { adminService } from "./admin.service.js";

const getAllRequests = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.getAllRequests(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "All requests retrieved successfully",
		data: result.requests,
		meta: result.meta,
	});
});

const assignRequest = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await adminService.assignRequest(req.user.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request assigned to resolver successfully",
		data: result,
	});
});

const reassignRequest = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await adminService.reassignRequest(req.user.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request reassigned successfully",
		data: result,
	});
});

const updateRequestStatus = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await adminService.updateRequestStatus(
		req.user.userId,
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request status updated successfully",
		data: result,
	});
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.getAllUsers(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Users retrieved successfully",
		data: result.users,
		meta: result.meta,
	});
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.updateUserStatus(
		req.params.id as string,
		req.body.status,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "User status updated successfully",
		data: result,
	});
});

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
	const result = await adminService.getDashboardStats();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Dashboard stats retrieved successfully",
		data: result,
	});
});

export const adminController = {
	getAllRequests,
	assignRequest,
	reassignRequest,
	updateRequestStatus,
	getAllUsers,
	updateUserStatus,
	getDashboardStats,
};
