import { z } from "zod";

const locationSchema = z.object({
	address: z
		.string()
		.trim()
		.min(5, "Address must be at least 5 characters long"),
	latitude: z.string().trim().optional(),
	longitude: z.string().trim().optional(),
	area: z.string().trim().min(2, "Area must be at least 2 characters long"),
	city: z.string().trim().min(2, "City must be at least 2 characters long"),
});

const complaintSchema = z.object({
	type: z.literal("COMPLAINT"),
	title: z.string().trim().min(3, "Title must be at least 3 characters long"),
	description: z
		.string()
		.trim()
		.min(10, "Description must be at least 10 characters long"),
	categoryId: z.string().trim().min(1, "Category ID is required"),
	serviceId: z.string().trim().optional(),
	location: locationSchema,
});

const serviceRequestSchema = z.object({
	type: z.literal("SERVICE_REQUEST"),
	serviceId: z.string().trim().min(1, "Service ID is required"),
	location: locationSchema,
});

export const CreateRequestZodSchema = z.discriminatedUnion("type", [
	complaintSchema,
	serviceRequestSchema,
]);

export const CreateFeedbackZodSchema = z.object({
	rating: z
		.number()
		.int()
		.min(1, "Rating must be at least 1")
		.max(5, "Rating cannot exceed 5"),
	comment: z.string().trim().max(1000).optional(),
});

export const RequestValidation = {
	CreateRequestZodSchema,
	CreateFeedbackZodSchema,
};
