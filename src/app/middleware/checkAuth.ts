import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import type { Role } from "../../generated/prisma/enums.js";
import { envVars } from "../config/env.js";
import AppError from "../errorHelpers/AppError.js";
import { prisma } from "../lib/prisma.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";

declare global {
	namespace Express {
		interface Request {
			user?: {
				email: string;
				name?: string;
				userId: string;
				role: Role;
			};
		}
	}
}

// auth(Role.ADMIN, Role.CITIZEN, Role.RESOLVER)
export const auth = (...requiredRoles: Role[]) => {
	return catchAsync(
		async (req: Request, _res: Response, next: NextFunction) => {
			const token = req.cookies.accessToken
				? req.cookies.accessToken
				: req.headers.authorization?.startsWith("Bearer ")
					? req.headers.authorization?.split(" ")[1]
					: req.headers.authorization;

			if (!token) {
				throw new AppError(
					httpStatus.UNAUTHORIZED,
					"You are not logged in. Please log in to access this resource.",
				);
			}

			const verifiedToken = jwtUtils.verifyToken(
				token,
				envVars.ACCESS_TOKEN_SECRET,
			);

			if (!verifiedToken.success) {
				throw new AppError(
					httpStatus.UNAUTHORIZED,
					verifiedToken.error ?? "Invalid or expired token",
				);
			}

			const { email, name, userId, role } = verifiedToken.data as JwtPayload;

			if (requiredRoles.length && !requiredRoles.includes(role)) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Forbidden. You don't have permission to access this resource.",
				);
			}

			const user = await prisma.user.findUnique({
				where: {
					id: userId,
				},
			});

			if (!user || user.email !== email || user.role !== role) {
				throw new AppError(
					httpStatus.UNAUTHORIZED,
					"User not found. Please log in again.",
				);
			}

			if (user.isDeleted || user.status === "DELETED") {
				throw new AppError(
					httpStatus.UNAUTHORIZED,
					"Your account has been deleted.",
				);
			}

			if (user.status === "BANNED") {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Your account has been blocked. Please contact support.",
				);
			}

			req.user = {
				email,
				name: name,
				userId,
				role,
			};

			next();
		},
	);
};
