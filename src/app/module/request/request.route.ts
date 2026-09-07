import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { requestController } from "./request.controller";
import { RequestValidation } from "./request.validation";

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
