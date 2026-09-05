import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary";

export const uploadToCloudinary = (
	buffer: Buffer,
	options?: UploadApiOptions,
): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(options, (error, result) => {
				if (error) return reject(error);
				if (!result) return reject(new Error("No result from Cloudinary"));

				resolve(result);
			})
			.end(buffer);
	});
};
