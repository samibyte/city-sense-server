import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { requestService } from "./request.service.js";
import { CreateRequestZodSchema } from "./request.validation.js";

const createRequest = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const files = req.files as Express.Multer.File[];
	let payload = req.body;

	if (req.body.data) {
		try {
			payload = JSON.parse(req.body.data);
		} catch {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Invalid JSON data in request",
			);
		}
	}

	const validatedData = CreateRequestZodSchema.parse(payload);

	const result = await requestService.createRequest(
		req.user.userId,
		validatedData,
		files || [],
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: result.service?.isPaid
			? "Request created. Payment is required to proceed."
			: "Request submitted successfully",
		data: result,
	});
});

const getMyRequests = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await requestService.getMyRequests(req.user.userId, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Requests retrieved successfully",
		data: result.requests,
		meta: result.meta,
	});
});

const getRequestById = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await requestService.getRequestById(
		req.user.userId,
		req.user.role,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request details retrieved successfully",
		data: result,
	});
});

const cancelRequest = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await requestService.cancelRequest(
		req.user.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request cancelled successfully",
		data: result,
	});
});

const giveFeedback = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await requestService.giveFeedback(
		req.user.userId,
		req.params.id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: "Feedback submitted successfully",
		data: result,
	});
});

const confirmCompletion = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await requestService.confirmCompletion(
		req.user.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Request completion confirmed successfully",
		data: result,
	});
});

export const requestController = {
	createRequest,
	getMyRequests,
	getRequestById,
	cancelRequest,
	giveFeedback,
	confirmCompletion,
};
