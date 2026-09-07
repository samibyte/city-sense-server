import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { requestController } from "./request.controller.js";
import { RequestValidation } from "./request.validation.js";

export const requestRouter = Router();

requestRouter.post(
	"/",
	auth(Role.CITIZEN),
	upload.array("attachments", 5),
	requestController.createRequest,
);

requestRouter.get(
	"/my-requests",
	auth(Role.CITIZEN),
	requestController.getMyRequests,
);

requestRouter.get(
	"/:id",
	auth(Role.CITIZEN, Role.RESOLVER, Role.ADMIN),
	requestController.getRequestById,
);

requestRouter.patch(
	"/:id/cancel",
	auth(Role.CITIZEN),
	requestController.cancelRequest,
);

requestRouter.post(
	"/:id/feedback",
	auth(Role.CITIZEN),
	validateRequest(RequestValidation.CreateFeedbackZodSchema),
	requestController.giveFeedback,
);
