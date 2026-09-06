import bcrypt from "bcrypt";
import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import crypto from "node:crypto";
import path from "node:path";
import {
	AuthProvider,
	ResolverVerificationStatus,
	Role,
} from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/lib";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis-client";
import type {
	IApplyAsResolverPayload,
	IReviewApplicationPayload,
} from "./resolver.interface";

const applyAsResolver = async (
	payload: IApplyAsResolverPayload,
	resume: Express.Multer.File | null,
	additionalFiles: Express.Multer.File[],
) => {
	if (!resume) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resume is required to submit a resolver application",
		);
	}

	const allowedMimeTypes = [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg",
		"image/png",
	];

	if (!allowedMimeTypes.includes(resume.mimetype)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resume must be a PDF, DOC, DOCX, JPG, or PNG file",
		);
	}

	if (resume.size > 5 * 1024 * 1024) {
		throw new AppError(httpStatus.BAD_REQUEST, "Resume must be less than 5MB");
	}

	if (additionalFiles.length > 10) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You can upload at most 10 supporting files",
		);
	}

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

	const resolverApplication = await prisma.user.create({
		data: {
			...payload.user,
			authProvider: AuthProvider.CREDENTIAL,
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
		omit: {
			passwordHash: true,
			googleId: true,
			profileUrl: true,
			profilePublicId: true,
			deletedAt: true,
			isDeleted: true,
		},
		include: {
			resolver: {
				select: {
					id: true,
					bio: true,
					resume: true,
					verificationStatus: true,
					departmentId: true,
					userId: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/resolver-application.ejs",
	);

	const templateData = {
		name: payload.user.name,
		email: payload.user.email,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: payload.user.email,
		subject: "Your Resolver Application Is Under Review",
		html,
	});

	return resolverApplication;
};

const reviewApplication = async (
	payload: IReviewApplicationPayload,
	reviewerUser: { userId: string },
) => {
	const { resolverId, verificationStatus, rejectionReason } = payload;

	const resolverApplication = await prisma.resolverProfile.findUnique({
		where: { id: resolverId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	if (!resolverApplication) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Resolver application not found",
		);
	}

	if (
		resolverApplication.verificationStatus !==
		ResolverVerificationStatus.PENDING
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`This application has already been ${resolverApplication.verificationStatus.toLowerCase()}`,
		);
	}

	if (verificationStatus === ResolverVerificationStatus.APPROVED) {
		const generatedPassword = crypto.randomBytes(8).toString("hex");
		const hashedPassword = await bcrypt.hash(
			generatedPassword,
			Number(envVars.BCRYPT_SALT_ROUNDS),
		);

		const [, updatedApplication] = await prisma.$transaction([
			prisma.user.update({
				where: { id: resolverApplication.user.id },
				data: {
					passwordHash: hashedPassword,
					emailVerified: true,
					needPasswordChange: true,
				},
			}),
			prisma.resolverProfile.update({
				where: { id: resolverApplication.id },
				data: {
					verificationStatus: ResolverVerificationStatus.APPROVED,
					rejectionReason: null,
					reviewedBy: reviewerUser.userId,
					reviewedAt: new Date(),
				},
				select: {
					id: true,
					bio: true,
					resume: true,
					verificationStatus: true,
					departmentId: true,
					userId: true,
					reviewedBy: true,
					reviewedAt: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
		]);

		const templatePath = path.join(
			process.cwd(),
			"src/app/templates/resolver-approved.ejs",
		);

		const html = await ejs.renderFile(templatePath, {
			name: resolverApplication.user.name,
			email: resolverApplication.user.email,
			password: generatedPassword,
			year: new Date().getFullYear(),
		});

		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to: resolverApplication.user.email,
			subject: "Your Resolver Application Has Been Approved",
			html,
		});

		return { ...updatedApplication, email: resolverApplication.user.email };
	}

	const updatedApplication = await prisma.resolverProfile.update({
		where: { id: resolverApplication.id },
		data: {
			verificationStatus: ResolverVerificationStatus.REJECTED,
			rejectionReason: rejectionReason ?? null,
			reviewedBy: reviewerUser.userId,
			reviewedAt: new Date(),
		},
		select: {
			id: true,
			bio: true,
			resume: true,
			verificationStatus: true,
			rejectionReason: true,
			departmentId: true,
			userId: true,
			reviewedBy: true,
			reviewedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/resolver-rejected.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: resolverApplication.user.name,
		rejectionReason: rejectionReason ?? "",
		year: new Date().getFullYear(),
	});

	await transporter.sendMail({
		from: envVars.EMAIL_SENDER.SMTP_FROM,
		to: resolverApplication.user.email,
		subject: "Update on Your Resolver Application",
		html,
	});

	return { ...updatedApplication, email: resolverApplication.user.email };
};

export const resolverService = {
	applyAsResolver,
	reviewApplication,
};
