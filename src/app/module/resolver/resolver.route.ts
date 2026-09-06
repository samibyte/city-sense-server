import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { upload } from "../../lib/multer";
import { resolverController } from "./resolver.controller";
import { ReviewApplicationZodSchema } from "./resolver.validation";

export const resolverRouter = Router();

resolverRouter.post(
	"/apply-as-resolver",
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	resolverController.applyAsResolver,
);

resolverRouter.patch(
	"/application-review",
	auth(Role.ADMIN),
	validateRequest(ReviewApplicationZodSchema),
	resolverController.reviewApplication,
);
