import { Router } from "express";
import { upload } from "../../lib/multer";
import { resolverController } from "./resolver.controller";

export const resolverRouter = Router();

resolverRouter.post(
	"/apply-as-resolver",
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	resolverController.applyAsResolver,
);
