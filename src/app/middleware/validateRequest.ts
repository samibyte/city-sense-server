import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import AppError from "../errorHelpers/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import type z from "zod";

export const validateRequest = (zodSchema: z.ZodSchema) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		const payload = req.body ?? {};
		const result = zodSchema.safeParse(payload);

		if (!result.success) {
			const issues =
				result.error instanceof ZodError ? result.error.issues : [];
			const errorMessages = issues.map((issue) => {
				const path = issue.path.length > 0 ? issue.path.join(".") : "";
				return path ? `${path}: ${issue.message}` : issue.message;
			});

			throw new AppError(
				httpStatus.BAD_REQUEST,
				errorMessages[0] ?? "Validation failed",
				"",
				errorMessages,
			);
		}
		req.body = result.data;
		next();
	});
};
