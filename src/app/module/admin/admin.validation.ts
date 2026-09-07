import { z } from "zod";

export const AssignRequestZodSchema = z.object({
	requestId: z.string().trim().min(1, "Request ID is required"),
	resolverId: z.string().trim().min(1, "Resolver ID is required"),
	priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
});

export const ReassignRequestZodSchema = z.object({
	requestId: z.string().trim().min(1, "Request ID is required"),
	newResolverId: z.string().trim().min(1, "New Resolver ID is required"),
	priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
	reason: z.string().trim().optional(),
});

export const UpdateRequestStatusAdminZodSchema = z.object({
	status: z.enum([
		"SUBMITTED",
		"ASSIGNED",
		"ACCEPTED",
		"IN_PROGRESS",
		"ON_HOLD",
		"RESOLVED",
		"COMPLETED",
		"REJECTED",
		"CANCELLED",
	]),
	notes: z.string().trim().optional(),
	slaDeadline: z.string().datetime().optional(),
});

export const UpdateUserStatusZodSchema = z.object({
	status: z.enum(["ACTIVE", "BANNED", "DELETED"]),
});

export const AdminValidation = {
	AssignRequestZodSchema,
	ReassignRequestZodSchema,
	UpdateRequestStatusAdminZodSchema,
	UpdateUserStatusZodSchema,
};
