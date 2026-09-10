import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { userService } from "./user.service.js";

const updateProfile = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const payload = req.body;
	const profileImageBuffer = req.file?.buffer;

	const result = await userService.updateProfile(
		req.user.userId,
		payload,
		profileImageBuffer,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Profile updated successfully",
		data: result,
	});
});

export const userController = {
	updateProfile,
};
