import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { cloudinary } from "../../lib/cloudinary.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import AppError from "../../errorHelpers/AppError.js";
import type { IUpdateProfilePayload } from "./user.interface.js";

const updateProfile = async (
	userId: string,
	payload: IUpdateProfilePayload,
	profileImageBuffer?: Buffer,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
		include: { citizen: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const userData: Record<string, string> = {};

	if (payload.name) {
		userData.name = payload.name;
	}

	if (payload.phone !== undefined) {
		userData.phone = payload.phone;
	}

	if (profileImageBuffer) {
		if (user.profilePublicId) {
			try {
				await cloudinary.uploader.destroy(user.profilePublicId);
			} catch (error) {
				console.error("Failed to delete old profile image:", error);
			}
		}

		const uploadResult = await uploadToCloudinary(profileImageBuffer, {
			resource_type: "image",
		});

		userData.profileUrl = uploadResult.secure_url;
		userData.profilePublicId = uploadResult.public_id;
	}

	await prisma.user.update({
		where: { id: userId },
		data: userData,
	});

	if (payload.address && user.citizen) {
		await prisma.citizenProfile.update({
			where: { userId },
			data: { address: payload.address },
		});
	}

	const result = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
		include: { citizen: true },
	});

	return result;
};

export const userService = {
	updateProfile,
};
