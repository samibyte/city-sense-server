import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { resolverController } from "./resolver.controller.js";
import {
	RejectAssignmentZodSchema,
	ReviewApplicationZodSchema,
	UpdateAssignmentStatusZodSchema,
} from "./resolver.validation.js";

export const resolverRouter = Router();

resolverRouter.post(
	"/apply-as-resolver",
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	resolverController.applyAsResolver,
);

resolverRouter.get(
	"/applications",
	auth(Role.ADMIN),
	resolverController.getAllApplications,
);

resolverRouter.get(
	"/applications/:id",
	auth(Role.ADMIN),
	resolverController.getApplicationById,
);

resolverRouter.patch(
	"/application-review",
	auth(Role.ADMIN),
	validateRequest(ReviewApplicationZodSchema),
	resolverController.reviewApplication,
);

resolverRouter.get(
	"/assignments",
	auth(Role.RESOLVER),
	resolverController.getMyAssignments,
);

resolverRouter.get(
	"/assignments/:id",
	auth(Role.RESOLVER),
	resolverController.getAssignmentById,
);

resolverRouter.patch(
	"/assignments/:id/accept",
	auth(Role.RESOLVER),
	resolverController.acceptAssignment,
);

resolverRouter.patch(
	"/assignments/:id/reject",
	auth(Role.RESOLVER),
	validateRequest(RejectAssignmentZodSchema),
	resolverController.rejectAssignment,
);

resolverRouter.patch(
	"/assignments/:id/status",
	auth(Role.RESOLVER),
	validateRequest(UpdateAssignmentStatusZodSchema),
	resolverController.updateAssignmentStatus,
);
