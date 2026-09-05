import bcrypt from "bcrypt";
import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import crypto from "node:crypto";
import path from "node:path";
import { AuthProvider, Role } from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/lib";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis-client";
import type { IApplyAsResolverPayload } from "./resolver.interface";

const applyAsResolver = async (
	payload: IApplyAsResolverPayload,
	resume: Express.Multer.File | null,
	additionalFiles: Express.Multer.File[],
) => {
	const userExists = await prisma.user.findByEmail(payload.user.email);

	if (userExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User Already Exists With This Email",
		);
	}

	const departmentExists = await prisma.department.findUnique({
		where: {
			id: payload.resolver.departmentId,
		},
	});
	if (!departmentExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "Department doesn't exist");
	}

	const resumeUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},

					async (error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result returned from Cloudinary",
								),
							);
						}

						resolve(result);
					},
				)
				.end(resume?.buffer);
		},
	);

	const additionalFilesUploadResults = await Promise.all(
		additionalFiles.map((file) => {
			return new Promise<UploadApiResponse>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{
							resource_type: "auto",
						},

						async (error, result) => {
							if (error) {
								return reject(error);
							}

							if (!result) {
								return reject(new Error("No result returned from Cloudinary"));
							}

							resolve(result);
						},
					)
					.end(file.buffer);
			});
		}),
	);

	const randomResolverPassword = Math.random().toString(36).slice(-8);

	const hashedPassword = await bcrypt.hash(
		randomResolverPassword,
		Number(envVars.BCRYPT_SALT_ROUNDS),
	);

	const resolverApplication = await prisma.user.create({
		data: {
			...payload.user,
			authProvider: AuthProvider.CREDENTIAL,
			passwordHash: hashedPassword,
			role: Role.RESOLVER,
			needPasswordChange: true,
			resolver: {
				create: {
					...payload.resolver,
					resume: resumeUploadResult.secure_url,
					resumePublicId: resumeUploadResult.public_id,
					additionalFiles: additionalFilesUploadResults.map((file) => ({
						url: file.secure_url,
						publicId: file.public_id,
					})),
				},
			},
		},

		include: {
			resolver: true,
		},
	});

	const expirationSeconds = 60 * 60;

	const otpKey = `resolver-application-otp:${payload.user.email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name: payload.user.name,
		email: payload.user.email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: payload.user.email,
		subject: "Resolver Application - Email Verification",
		html,
	});

	return resolverApplication;
};

export const resolverService = {
	applyAsResolver,
};
