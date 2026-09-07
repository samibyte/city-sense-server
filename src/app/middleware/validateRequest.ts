import type { NextFunction, Request, Response } from "express";
import type z from "zod";
import { catchAsync } from "../utils/catchAsync.js";

export const validateRequest = (zodSchema: z.ZodSchema) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		const payload = req.body ?? {};
		const result = zodSchema.safeParse(payload);

		if (!result.success) {
			console.log(result.error);
			console.log(result.error.issues);
			throw new Error(result.error.issues[0].message);
		}
		req.body = result.data;
		next();
	});
};
