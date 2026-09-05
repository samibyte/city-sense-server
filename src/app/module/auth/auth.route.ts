import { Router } from "express";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

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
