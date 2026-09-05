import bcrypt from "bcrypt";
import httpStatus from "http-status";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { generateAuthTokens } from "../../utils/auth-token";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import type { IRegisterCitizenPayload } from "./auth.interface";

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

export const authService = {
	registerCitizen,
};
