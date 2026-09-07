import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { upload } from "../../lib/multer.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authController } from "./auth.controller.js";
import { UserValidation } from "./auth.validation.js";
import { Role } from "../../../generated/prisma/enums.js";

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
	"/forgot-password",
	validateRequest(UserValidation.ForgotPasswordZodSchema),
	authController.forgotPassword,
);

authRouter.post(
	"/reset-password",
	validateRequest(UserValidation.ResetPasswordZodSchema),
	authController.resetPassword,
);

authRouter.post(
	"/verify-email",
	validateRequest(UserValidation.VerifyEmailZodSchema),
	authController.verifyEmail,
);
