import httpStatus from "http-status";
import type { AuthProvider, Role } from "../../../generated/prisma/enums.js";
import { UserStatus } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import AppError from "../../errorHelpers/AppError.js";

export type ICreateCitizenWithCredsPayload = {
	name: string;
	email: string;
	phone?: string;
	profileUrl?: string | null;
	profilePublicId?: string | null;
	passwordHash: string;
	authProvider: AuthProvider;
	role: Role;
	status: UserStatus;
	emailVerified: boolean;
	citizen: {
		create: {
			address?: string;
		};
	};
};

export const userRepository = Prisma.defineExtension({
	name: "userRepository",
	model: {
		user: {
			async findByEmail(email: string) {
				const ctx = Prisma.getExtensionContext(this);
				return ctx.findUnique({
					where: { email },
				});
			},

			async createCitizenWithCreds(userData: ICreateCitizenWithCredsPayload) {
				const ctx = Prisma.getExtensionContext(this);

				return await ctx.create({
					data: { ...userData },
					omit: { passwordHash: true },
					include: { citizen: true },
				});
			},

			async getActiveUserOrThrow(email: string) {
				const ctx = Prisma.getExtensionContext(this);

				const user = await ctx.findByEmail(email);

				if (!user) {
					throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
				}

				if (user.status === UserStatus.BANNED) {
					throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
				}

				if (user.isDeleted || user.status === UserStatus.DELETED) {
					throw new AppError(httpStatus.UNAUTHORIZED, "User is deleted");
				}

				if (user.passwordHash === null && user.googleId !== null) {
					throw new AppError(
						httpStatus.BAD_REQUEST,
						"User registered with google. PLease try again with google login",
					);
				}
				return user;
			},
		},
	},
});
