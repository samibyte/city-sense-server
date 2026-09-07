import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { resolverService } from "./resolver.service";
import { ApplyAsResolverZodSchema } from "./resolver.validation";

const applyAsResolver = catchAsync(async (req: Request, res: Response) => {
	const files = req.files as { [fieldname: string]: Express.Multer.File[] };

	const resume = files?.resume ? files.resume[0] : null;
	const additionalFiles = files?.additionalFiles || [];

	const zodValidationResult = ApplyAsResolverZodSchema.safeParse(
		JSON.parse(req.body.data),
	);

	if (!zodValidationResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			zodValidationResult.error.issues[0].message,
		);
	}

	const payload = zodValidationResult.data;

	const result = await resolverService.applyAsResolver(
		payload,
		resume,
		additionalFiles,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Resolver application successful",
		data: result,
	});
});

const reviewApplication = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await resolverService.reviewApplication(req.body, req.user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Resolver application reviewed successfully",
		data: result,
	});
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
	const result = await resolverService.getAllApplications(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Resolver applications retrieved successfully",
		data: result.applications,
		meta: result.meta,
	});
});

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
	const result = await resolverService.getApplicationById(
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Resolver application retrieved successfully",
		data: result,
	});
});

const getMyAssignments = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await resolverService.getMyAssignments(
		req.user.userId,
		req.query,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Assignments retrieved successfully",
		data: result.assignments,
		meta: result.meta,
	});
});

const getAssignmentById = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await resolverService.getAssignmentById(
		req.user.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Assignment retrieved successfully",
		data: result,
	});
});

const acceptAssignment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await resolverService.acceptAssignment(
		req.user.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Assignment accepted successfully",
		data: result,
	});
});

const rejectAssignment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
	}

	const result = await resolverService.rejectAssignment(
		req.user.userId,
		req.params.id as string,
		req.body.rejectedReason,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Assignment rejected successfully",
		data: result,
	});
});

const updateAssignmentStatus = catchAsync(
	async (req: Request, res: Response) => {
		if (!req.user) {
			throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");
		}

		const result = await resolverService.updateAssignmentStatus(
			req.user.userId,
			req.params.id as string,
			req.body,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			message: "Assignment status updated successfully",
			data: result,
		});
	},
);

export const resolverController = {
	applyAsResolver,
	reviewApplication,
	getAllApplications,
	getApplicationById,
	getMyAssignments,
	getAssignmentById,
	acceptAssignment,
	rejectAssignment,
	updateAssignmentStatus,
};
