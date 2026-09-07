import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.loginUser(payload);
	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "User logged in successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const registerCitizen = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const buffer = req.file?.buffer;
	const result = await authService.registerCitizen(payload, buffer);

	const { accessToken, refreshToken, user, citizen } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: "Citizen registered successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			citizen,
		},
	});
});

const sendEmailVerificationOtp = catchAsync(
	async (req: Request, res: Response) => {
		const payload = req.body;
		const result = await authService.sendEmailVerificationOtp(payload);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			message: "OTP sent successfully. Please check your email.",
			data: result,
		});
	},
);

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies.refreshToken || req.body.refreshToken;
	const result = await authService.refreshToken(token);

	res.cookie("accessToken", result.accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", result.refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Tokens refreshed successfully",
		data: result,
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const result = await authService.getMe(req.user?.userId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "User profile retrieved successfully",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.verifyEmail(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Email verified successfully",
		data: result,
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.forgotPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message:
			"If an account exists with this email, a password reset OTP has been sent.",
		data: result,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.resetPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Password reset successfully",
		data: result,
	});
});

export const authController = {
	loginUser,
	registerCitizen,
	sendEmailVerificationOtp,
	getMe,
	refreshToken,
	forgotPassword,
	resetPassword,
	verifyEmail,
};
