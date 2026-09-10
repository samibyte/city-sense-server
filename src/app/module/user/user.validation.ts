import { z } from "zod";

const UpdateProfileZodSchema = z.object({
	name: z
		.string()
		.min(3, "Name must be at least 3 characters long")
		.max(50)
		.optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
});

export const UserValidation = {
	UpdateProfileZodSchema,
};
