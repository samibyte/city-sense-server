import z from "zod";

const passwordSchema = z
	.string()
	.min(6, "Password Must Minimum 6 Characters Long.")
	.regex(/[a-z]/, "Password must contain at least 1 Lowercase Letter")
	.regex(/[A-Z]/, "Password must contain at least 1 Uppercase Letter")
	.regex(/[0-9]/, "Password must contain at least 1 Number")
	.regex(
		/[^A-Za-z0-9]/,
		"Password must contain at least 1 Special Character",
	);

const LoginZodSchema = z.object({
	email: z.email("Please provide a valid email!"),
	password: passwordSchema,
});

const CitizenRegisterZodSchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters long!").max(50),
	email: z.email("Please provide a valid email!"),
	password: passwordSchema,
	phone: z.string().optional(),
	address: z.string().optional(),
});

const VerifyEmailZodSchema = z.object({
	email: z.email("Please provide a valid email!"),
	otp: z.string().length(6, "OTP must be 6 digits"),
});

const SendEmailVerificationOtpZodSchema = z.object({
	email: z.email("Please provide a valid email!"),
});

const ForgotPasswordZodSchema = z.object({
	email: z.email("Please provide a valid email!"),
});

const ResetPasswordZodSchema = z
	.object({
		email: z.email("Please provide a valid email!"),
		otp: z.string().length(6, "OTP must be 6 digits"),
		newPassword: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match",
	});

export const UserValidation = {
	LoginZodSchema,
	CitizenRegisterZodSchema,
	VerifyEmailZodSchema,
	SendEmailVerificationOtpZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
};