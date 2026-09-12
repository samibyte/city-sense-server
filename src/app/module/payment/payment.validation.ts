import { z } from "zod";

export const CreatePaymentZodSchema = z.object({
	requestId: z.string().uuid("requestId must be a valid UUID"),
});

export const ConfirmPaymentZodSchema = z.object({
	transactionId: z.string().trim().min(1, "transactionId is required"),
});

export const PaymentValidation = {
	CreatePaymentZodSchema,
	ConfirmPaymentZodSchema,
};
