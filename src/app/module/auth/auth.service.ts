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
} from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { transporter } from "../../lib/lib";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis-client";
import { generateAuthTokens } from "../../utils/auth-token";
import { jwtUtils } from "../../utils/jwt";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import type {
	ILoginPayload,
	IRegisterCitizenPayload,
	ISendEmailVerificationOtpPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

const EMAIL_VERIFICATION_OTP_EXPIRATION_SECONDS = 60 * 10;

const sendEmailVerificationOtpMail = async (user: {
	name: string;
	email: string;
}) => {
	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const otpKey = `citizen-email-verification-otp:${user.email}`;

	await redisClient.set(otpKey, otpValue, {
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
	console.log(createdUser);

	const { citizen, ...user } = createdUser;

	await sendEmailVerificationOtpMail(user);

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
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Email is already verified",
		);
	}

	const result = await sendEmailVerificationOtpMail(user);

	return result;
};

const refreshToken = async (refreshToken: string) => {
	if (!refreshToken) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Refresh token is required",
		);
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
			resolver: true,
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
	const storedOtp = await redisClient.get(otpKey);

	if (!storedOtp || storedOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	const verifiedUser = await prisma.user.update({
		where: { id: user.id },
		data: { emailVerified: true },
		omit: { passwordHash: true },
	});

	await redisClient.del(otpKey);

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

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: user.email,
		subject: "Your Email Has Been Verified",
		html,
	});

	return verifiedUser;
};

export const authService = {
	loginUser,
	registerCitizen,
	sendEmailVerificationOtp,
	getMe,
	refreshToken,
	verifyEmail,
};
