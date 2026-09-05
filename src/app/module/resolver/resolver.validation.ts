import { z } from "zod";

export const ApplyAsResolverZodSchema = z.object({
	user: z.object({
		name: z.string().trim().min(2, "Name must be at least 2 characters long"),

		email: z.email("Invalid email address").trim().toLowerCase(),
		phone: z.string().trim().min(5, "Contact number is invalid").optional(),
		address: z
			.string()
			.trim()
			.min(5, "Address must be at least 5 characters long")
			.optional(),
	}),

	resolver: z.object({
		bio: z
			.string()
			.trim()
			.max(1000, "Bio cannot exceed 1000 characters")
			.optional(),
		departmentId: z.string("Please provide departmentId"),
	}),
});
