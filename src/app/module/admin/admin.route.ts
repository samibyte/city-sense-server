import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

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
