import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { paymentService } from "./payment.service.js";
import {
	ConfirmPaymentZodSchema,
	CreatePaymentZodSchema,
} from "./payment.validation.js";

const createPayment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const validatedData = CreatePaymentZodSchema.parse(req.body);

	const result = await paymentService.createPayment(
		req.user.userId,
		validatedData,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message:
			"Stripe checkout session created successfully. Use the checkoutUrl to complete payment.",
		data: result,
	});
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const validatedData = ConfirmPaymentZodSchema.parse(req.body);

	const result = await paymentService.confirmPayment(
		req.user.userId,
		validatedData,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Payment verified and completed. Request is now submitted.",
		data: result,
	});
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
	const signature = req.headers["stripe-signature"] as string;

	if (!signature) {
		throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe signature");
	}

	const result = await paymentService.handleStripeWebhook(req.body, signature);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Webhook processed",
		data: result,
	});
});

const getPaymentByRequestId = catchAsync(
	async (req: Request, res: Response) => {
		if (!req.user) {
			throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
		}

		const result = await paymentService.getPaymentByRequestId(
			req.user.userId,
			req.params.requestId as string,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			message: "Payment retrieved successfully",
			data: result,
		});
	},
);

export const paymentController = {
	createPayment,
	confirmPayment,
	handleWebhook,
	getPaymentByRequestId,
};
