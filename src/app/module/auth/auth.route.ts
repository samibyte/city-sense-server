import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { upload } from "../../lib/multer.js";
import {
	authRateLimiter,
	otpRateLimiter,
} from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authController } from "./auth.controller.js";
import { UserValidation } from "./auth.validation.js";
import { Role } from "../../../generated/prisma/enums.js";

export const authRouter = Router();

authRouter.post(
	"/register",
	authRateLimiter,
	upload.single("profileImage"),
	validateRequest(UserValidation.CitizenRegisterZodSchema),
	authController.registerCitizen,
);

authRouter.post(
	"/login",
	authRateLimiter,
	validateRequest(UserValidation.LoginZodSchema),
	authController.loginUser,
);

authRouter.get(
	"/me",
	auth(Role.ADMIN, Role.CITIZEN, Role.RESOLVER),
	authController.getMe,
);

authRouter.post("/refresh-token", authRateLimiter, authController.refreshToken);

authRouter.post(
	"/send-verification-otp",
	otpRateLimiter,
	validateRequest(UserValidation.SendEmailVerificationOtpZodSchema),
	authController.sendEmailVerificationOtp,
);

authRouter.post(
	"/forgot-password",
	otpRateLimiter,
	validateRequest(UserValidation.ForgotPasswordZodSchema),
	authController.forgotPassword,
);

authRouter.post(
	"/reset-password",
	otpRateLimiter,
	validateRequest(UserValidation.ResetPasswordZodSchema),
	authController.resetPassword,
);

authRouter.post(
	"/verify-email",
	otpRateLimiter,
	validateRequest(UserValidation.VerifyEmailZodSchema),
	authController.verifyEmail,
);

authRouter.post("/login/google", authRateLimiter, authController.googleLogin);
