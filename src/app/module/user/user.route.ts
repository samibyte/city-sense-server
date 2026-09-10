import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { userController } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";

export const userRouter = Router();

userRouter.patch(
	"/profile",
	auth(Role.CITIZEN, Role.RESOLVER, Role.ADMIN),
	upload.single("profileImage"),
	validateRequest(UserValidation.UpdateProfileZodSchema),
	userController.updateProfile,
);
