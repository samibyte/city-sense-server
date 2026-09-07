import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { adminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

export const adminRouter = Router();

adminRouter.use(auth(Role.ADMIN));

adminRouter.get("/stats", adminController.getDashboardStats);

adminRouter.get("/requests", adminController.getAllRequests);

adminRouter.post(
	"/requests/assign",
	validateRequest(AdminValidation.AssignRequestZodSchema),
	adminController.assignRequest,
);

adminRouter.post(
	"/requests/reassign",
	validateRequest(AdminValidation.ReassignRequestZodSchema),
	adminController.reassignRequest,
);

adminRouter.patch(
	"/requests/:id/status",
	validateRequest(AdminValidation.UpdateRequestStatusAdminZodSchema),
	adminController.updateRequestStatus,
);

adminRouter.get("/users", adminController.getAllUsers);

adminRouter.patch(
	"/users/:id/status",
	validateRequest(AdminValidation.UpdateUserStatusZodSchema),
	adminController.updateUserStatus,
);
