import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Prisma } from "../../generated/prisma/client";
import { envVars } from "../config/env";

export const globalErrorHandler = async (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (envVars.NODE_ENV === "development") {
		console.log("Error from Global Error Handler", err);
	}

	// 1. Set default values
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage =
		err instanceof Error ? err.message : "Internal Server Error";
	const errorName = err instanceof Error ? err.name : "Internal Server Error";

	// 2. Safely extract dynamic statusCode from custom errors (like AppError)
	if (err && typeof err === "object" && "statusCode" in err) {
		statusCode = (err as { statusCode: number }).statusCode;
	}

	// 3. Handle Prisma Specific Errors
	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Duplicate Key Error";
		} else if (err.code === "P2003") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Foreign key constraint failed";
		} else if (err.code === "P2025") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage =
				"An operation failed because it depends on one or more records that were required but not found.";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = httpStatus.UNAUTHORIZED;
			errorMessage =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (err.errorCode === "P1001") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		errorMessage = "Error occurred during query execution";
	}

	// 4. Send the response using the dynamic "statusCode" variable instead of hardcoding 500
	res.status(statusCode).json({
		success: false,
		statusCode: statusCode,
		message:
			envVars.NODE_ENV === "development"
				? errorMessage
				: "Internal Server Error",
		data:
			envVars.NODE_ENV === "development"
				? {
						name: errorName,
						stack: err instanceof Error ? err.stack : undefined,
						raw: errorName !== "AppError" ? err : undefined,
					}
				: null,
	});
};
