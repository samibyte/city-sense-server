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

export const resolverController = {
	applyAsResolver,
};
