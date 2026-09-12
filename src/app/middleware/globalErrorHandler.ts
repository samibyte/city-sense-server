import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import AppError from "../errorHelpers/AppError.js";

const formatZodIssues = (error: ZodError): string[] =>
	error.issues.map((issue) => {
		const path = issue.path.length > 0 ? issue.path.join(".") : "";
		return path ? `${path}: ${issue.message}` : issue.message;
	});

export const globalErrorHandler = async (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	console.error("Error from Global Error Handler", err);

	// 1. Set default values
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage =
		err instanceof Error ? err.message : "Internal Server Error";
	const errors: string[] = [];

	// 2. Safely extract dynamic statusCode and errors from custom errors (like AppError)
	if (err instanceof AppError) {
		statusCode = err.statusCode;
		errorMessage = err.message;
		if (err.errors.length > 0) {
			errors.push(...err.errors);
		}
	}

	// 3. Handle Zod validation errors (from controllers using .parse())
	if (err instanceof ZodError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "Validation failed";
		errors.push(...formatZodIssues(err));
	}

	// 4. Handle Prisma Specific Errors
	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		// Type assertion for err to ensure type safety
		const knownError = err as Prisma.PrismaClientKnownRequestError;
		if (knownError.code === "P2002") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Duplicate Key Error";
		} else if (knownError.code === "P2003") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Foreign key constraint failed";
		} else if (knownError.code === "P2025") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage =
				"An operation failed because it depends on one or more records that were required but not found.";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		// Type assertion for err to ensure type safety
		const initError = err as Prisma.PrismaClientInitializationError;
		if (initError.errorCode === "P1000") {
			statusCode = httpStatus.UNAUTHORIZED;
			errorMessage =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (initError.errorCode === "P1001") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		errorMessage = "Error occurred during query execution";
	}

	// 5. Send the response using the dynamic "statusCode" variable instead of hardcoding 500
	res.status(statusCode).json({
		success: false,
		statusCode: statusCode,
		message: errorMessage,
		errors,
	});
};
