import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { paymentController } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";

export const paymentRouter = Router();

// POST /api/v1/payments/create — Create a Stripe Checkout session for a PENDING request
paymentRouter.post(
	"/create",
	auth(Role.CITIZEN),
	validateRequest(PaymentValidation.CreatePaymentZodSchema),
	paymentController.createPayment,
);

// POST /api/v1/payments/confirm — Confirm payment; marks payment PAID + request SUBMITTED
paymentRouter.post(
	"/confirm",
	auth(Role.CITIZEN),
	validateRequest(PaymentValidation.ConfirmPaymentZodSchema),
	paymentController.confirmPayment,
);

paymentRouter.get(
	"/:requestId",
	auth(Role.CITIZEN),
	paymentController.getPaymentByRequestId,
);

// Webhook router - mounted before JSON parser in app.ts
export const paymentWebhookRouter = Router();

paymentWebhookRouter.post("/", paymentController.handleWebhook);
