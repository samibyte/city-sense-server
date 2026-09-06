import { z } from "zod";

export const CreateDepartmentZodSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters long"),
	description: z
		.string()
		.trim()
		.min(5, "Description must be at least 5 characters long"),
});

export const UpdateDepartmentZodSchema = z.object({
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
});

export const DepartmentValidation = {
	CreateDepartmentZodSchema,
	UpdateDepartmentZodSchema,
};
