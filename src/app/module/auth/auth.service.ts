import bcrypt from "bcrypt";
import ejs from "ejs";
import httpStatus from "http-status";
import crypto from "node:crypto";
import path from "node:path";
import type { JwtPayload } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { transporter } from "../../lib/lib.js";
import { prisma } from "../../lib/prisma.js";
import { redisDel, redisGet, redisSet } from "../../lib/redis-client.js";
import { generateAuthTokens } from "../../utils/auth-token.js";
import { jwtUtils } from "../../utils/jwt.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import type {
	IForgotPasswordPayload,
	ILoginPayload,
	IRegisterCitizenPayload,
	IResetPasswordPayload,
	ISendEmailVerificationOtpPayload,
	IVerifyEmailPayload,
} from "./auth.interface.js";

const EMAIL_VERIFICATION_OTP_EXPIRATION_SECONDS = 60 * 10;
const PASSWORD_RESET_OTP_EXPIRATION_SECONDS = 60 * 15;

const sendEmailVerificationOtpMail = async (user: {
	name: string;
	email: string;
}) => {
	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const otpKey = `citizen-email-verification-otp:${user.email}`;

	await redisSet(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: EMAIL_VERIFICATION_OTP_EXPIRATION_SECONDS,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name: user.name,
		email: user.email,
		otp: otpValue,
		expirationMinutes: EMAIL_VERIFICATION_OTP_EXPIRATION_SECONDS / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: user.email,
		subject: "Email Verification OTP",
		html,
	});

	return {
		email: user.email,
		expirationMinutes: EMAIL_VERIFICATION_OTP_EXPIRATION_SECONDS / 60,
	};
};

const loginUser = async (payload: ILoginPayload) => {
	const { email, password } = payload;

	const user = await prisma.user.getActiveUserOrThrow(email);
	const passwordMatched = await bcrypt.compare(
		password,
		user.passwordHash as string,
	);

	if (!passwordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	await prisma.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const authTokens = generateAuthTokens(jwtPayload);

	return {
		...authTokens,
	};
};

const registerCitizen = async (
	payload: IRegisterCitizenPayload,
	profileImageBuffer?: Buffer,
) => {
	const { name, password, phone, address } = payload;
	const email = payload.email.trim().toLowerCase();

	const userExists = await prisma.user.findByEmail(email);

	if (userExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(envVars.BCRYPT_SALT_ROUNDS),
	);

	const profileImage = profileImageBuffer
		? await uploadToCloudinary(profileImageBuffer, {
				resource_type: "auto",
			})
		: null;

	const userData = {
		name,
		profileUrl: profileImage?.secure_url ?? null,
		profilePublicId: profileImage?.public_id ?? null,
		email,
		authProvider: AuthProvider.CREDENTIAL,
		passwordHash: hashedPassword,
		role: Role.CITIZEN,
		status: UserStatus.ACTIVE,
		emailVerified: false,
		phone: phone,
		citizen: {
			create: {
				address,
			},
		},
	};

	const createdUser = await prisma.user.createCitizenWithCreds(userData);

	const { citizen, ...user } = createdUser;

	try {
		await sendEmailVerificationOtpMail(user);
	} catch (error) {
		console.error("Failed to send email verification OTP:", error);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const authTokens = generateAuthTokens(jwtPayload);

	return {
		user,
		citizen,
		...authTokens,
	};
};

const sendEmailVerificationOtp = async (
	payload: ISendEmailVerificationOtpPayload,
) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.getActiveUserOrThrow(email);

	if (user.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
	}

	const result = await sendEmailVerificationOtpMail(user);

	return result;
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	const canResetPassword =
		user &&
		user.isDeleted === false &&
		user.status !== UserStatus.DELETED &&
		user.status !== UserStatus.BANNED &&
		user.passwordHash !== null;

	if (!canResetPassword) {
		return {
			email,
			expirationMinutes: PASSWORD_RESET_OTP_EXPIRATION_SECONDS / 60,
		};
	}

	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const otpKey = `password-reset-otp:${email}`;

	await redisSet(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: PASSWORD_RESET_OTP_EXPIRATION_SECONDS,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/password-reset-otp.ejs",
	);

	const templateData = {
		name: user.name,
		email: user.email,
		otp: otpValue,
		expirationMinutes: PASSWORD_RESET_OTP_EXPIRATION_SECONDS / 60,
		year: new Date().getFullYear(),
	};

	const html = await ejs.renderFile(templatePath, templateData);

	try {
		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: user.email,
			subject: "Password Reset OTP",
			html,
		});
	} catch (error) {
		console.error("Failed to send password reset OTP email:", error);
	}

	return {
		email,
		expirationMinutes: PASSWORD_RESET_OTP_EXPIRATION_SECONDS / 60,
	};
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { otp, newPassword } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (
		!user ||
		user.isDeleted ||
		user.status === UserStatus.DELETED ||
		user.status === UserStatus.BANNED
	) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired OTP");
	}

	const otpKey = `password-reset-otp:${email}`;
	const storedOtp = await redisGet(otpKey);

	if (!storedOtp || storedOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	const hashedPassword = await bcrypt.hash(
		newPassword,
		Number(envVars.BCRYPT_SALT_ROUNDS),
	);

	const updatedUser = await prisma.user.update({
		where: { id: user.id },
		data: {
			passwordHash: hashedPassword,
			needPasswordChange: false,
		},
		omit: { passwordHash: true },
	});

	await redisDel(otpKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/password-reset-confirmation.ejs",
	);

	const templateData = {
		name: updatedUser.name,
		email: updatedUser.email,
		appUrl: envVars.FRONTEND_URL,
		year: new Date().getFullYear(),
	};

	const html = await ejs.renderFile(templatePath, templateData);

	try {
		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: updatedUser.email,
			subject: "Your Password Has Been Changed",
			html,
		});
	} catch (error) {
		console.error("Failed to send password change confirmation email:", error);
	}

	return updatedUser;
};

const refreshToken = async (refreshToken: string) => {
	if (!refreshToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is required");
	}

	const verifiedToken = jwtUtils.verifyToken(
		refreshToken,
		envVars.REFRESH_TOKEN_SECRET,
	);

	if (!verifiedToken.success) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or expired refresh token",
		);
	}

	const { userId } = verifiedToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User not found. Please log in again.",
		);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const authTokens = generateAuthTokens(jwtPayload);

	return authTokens;
};

const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: { passwordHash: true },
		include: {
			citizen: true,
			resolver: {
				include: {
					department: true,
				},
			},
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return user;
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const { email, otp } = payload;
	const normalizedEmail = email.trim().toLowerCase();

	const user = await prisma.user.getActiveUserOrThrow(normalizedEmail);

	if (user.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
	}

	const otpKey = `citizen-email-verification-otp:${normalizedEmail}`;
	const storedOtp = await redisGet(otpKey);

	if (!storedOtp || storedOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	const verifiedUser = await prisma.user.update({
		where: { id: user.id },
		data: { emailVerified: true },
		omit: { passwordHash: true },
	});

	await redisDel(otpKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/email-verified.ejs",
	);

	const templateData = {
		name: user.name,
		email: user.email,
		appUrl: envVars.FRONTEND_URL,
		year: new Date().getFullYear(),
	};

	const html = await ejs.renderFile(templatePath, templateData);

	try {
		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: user.email,
			subject: "Your Email Has Been Verified",
			html,
		});
	} catch (error) {
		console.error("Failed to send email verified notification:", error);
	}

	return verifiedUser;
};

export const authService = {
	loginUser,
	registerCitizen,
	sendEmailVerificationOtp,
	getMe,
	refreshToken,
	forgotPassword,
	resetPassword,
	verifyEmail,
};
