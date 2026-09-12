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
		city: z.string().trim().min(2, "City is required"),
		area: z.string().trim().optional(),
	}),
});

export const ReviewApplicationZodSchema = z
	.object({
		resolverId: z.string("Please provide resolverId").trim().min(1),
		verificationStatus: z.enum(["APPROVED", "REJECTED"]),
		rejectionReason: z
			.string("Please provide rejectionReason")
			.trim()
			.min(5, "Rejection reason must be at least 5 characters long")
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.verificationStatus === "REJECTED" && !data.rejectionReason) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "rejectionReason is required when rejecting an application",
				path: ["rejectionReason"],
			});
		}
	});

export const RejectAssignmentZodSchema = z.object({
	rejectedReason: z
		.string()
		.trim()
		.min(5, "Rejection reason must be at least 5 characters long"),
});

export const UpdateAssignmentStatusZodSchema = z.object({
	status: z.enum([
		"PENDING",
		"ACCEPTED",
		"REJECTED",
		"IN_PROGRESS",
		"COMPLETED",
		"REASSIGNED",
		"CANCELLED",
	]),
	notes: z.string().trim().optional(),
});
