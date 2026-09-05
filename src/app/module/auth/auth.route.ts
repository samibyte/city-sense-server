import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { Role } from "../../../generated/prisma/enums";

export const authRouter = Router();

authRouter.post(
	"/register",
	upload.single("profileImage"),
	validateRequest(UserValidation.CitizenRegisterZodSchema),
	authController.registerCitizen,
);

authRouter.post(
	"/login",
	validateRequest(UserValidation.LoginZodSchema),
	authController.loginUser,
);

authRouter.get(
	"/me",
	auth(Role.ADMIN, Role.CITIZEN, Role.RESOLVER),
	authController.getMe,
);

authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post(
	"/send-verification-otp",
	validateRequest(UserValidation.SendEmailVerificationOtpZodSchema),
	authController.sendEmailVerificationOtp,
);

authRouter.post(
	"/verify-email",
	validateRequest(UserValidation.VerifyEmailZodSchema),
	authController.verifyEmail,
);
