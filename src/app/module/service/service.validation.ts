import { z } from "zod";

export const CreateServiceZodSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters long"),
	description: z
		.string()
		.trim()
		.min(5, "Description must be at least 5 characters long"),
	price: z.number().min(0, "Price must be greater than or equal to 0"),
	estimatedDuration: z.number().positive().optional(),
	serviceType: z.enum(["FREE", "PAID"]).default("FREE"),
	departmentId: z.string().trim().min(1, "Department ID is required"),
	categoryId: z.string().trim().min(1, "Category ID is required"),
});

export const UpdateServiceZodSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters long")
		.optional(),
	description: z
		.string()
		.trim()
		.min(5, "Description must be at least 5 characters long")
		.optional(),
	price: z
		.number()
		.min(0, "Price must be greater than or equal to 0")
		.optional(),
	estimatedDuration: z.number().positive().optional(),
	serviceType: z.enum(["FREE", "PAID"]).optional(),
	departmentId: z
		.string()
		.trim()
		.min(1, "Department ID is required")
		.optional(),
	categoryId: z.string().trim().min(1, "Category ID is required").optional(),
});

export const CreateCategoryZodSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters long"),
	description: z
		.string()
		.trim()
		.min(5, "Description must be at least 5 characters long"),
	departmentId: z.string().trim().min(1, "Department ID is required"),
});

export const UpdateCategoryZodSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters long")
		.optional(),
	description: z
		.string()
		.trim()
		.min(5, "Description must be at least 5 characters long")
		.optional(),
	departmentId: z
		.string()
		.trim()
		.min(1, "Department ID is required")
		.optional(),
});

export const ServiceValidation = {
	CreateServiceZodSchema,
	UpdateServiceZodSchema,
	CreateCategoryZodSchema,
	UpdateCategoryZodSchema,
};
