import crypto from "node:crypto";
import httpStatus from "http-status";
import type Stripe from "stripe";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import {
	PaymentMethod,
	PaymentStatus,
	RequestStatus,
} from "../../../generated/prisma/enums.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import { assignmentService } from "../assignment/assignment.service.js";
import type {
	IConfirmPaymentPayload,
	ICreatePaymentPayload,
} from "./payment.interface.js";

const SUCCESS_URL = `${envVars.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&requestId={REQUEST_ID}`;

// Citizen: Initiate a payment session (creates Stripe Checkout URL)

const createPayment = async (
	userId: string,
	payload: ICreatePaymentPayload,
) => {
	const { requestId } = payload;

	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const request = await prisma.request.findUnique({
		where: { id: requestId },
		include: { service: true },
	});

	if (!request?.service || request.service.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to pay for this request",
		);
	}

	if (request.status !== RequestStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot initiate payment. Request status is "${request.status}" — only PENDING requests can be paid.`,
		);
	}

	if (!request.service.isPaid) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This service is free. Payment is not required.",
		);
	}

	const existing = await prisma.payment.findUnique({
		where: { requestId: request.id },
	});

	if (existing?.status === PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A successful payment record already exists for this request",
		);
	}

	let payment = existing;

	// Create the PENDING Payment record on first payment attempt
	if (!payment) {
		const tempTxnId = `TEMP-${crypto
			.randomUUID()
			.replace(/-/g, "")
			.toUpperCase()}`;

		payment = await prisma.payment.create({
			data: {
				transactionId: tempTxnId,
				amount: request.service.price,
				status: PaymentStatus.PENDING,
				paymentMethod: PaymentMethod.CARD,
				paymentProvider: "stripe",
				requestId: request.id,
				citizenId: citizen.id,
				serviceId: request.service.id,
			},
		});
	}

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		mode: "payment",
		line_items: [
			{
				price_data: {
					currency: "usd",
					product_data: {
						name: request.service.name,
						description: request.service.description || undefined,
					},
					unit_amount: Math.round(Number(request.service.price) * 100),
				},
				quantity: 1,
			},
		],
		metadata: {
			requestId: request.id,
			paymentId: payment.id,
		},
		success_url: SUCCESS_URL.replace("{REQUEST_ID}", request.id),
		cancel_url: `${envVars.FRONTEND_URL}/payment/cancel?requestId=${request.id}`,
	});

	const updatedPayment = await prisma.payment.update({
		where: { id: payment.id },
		data: {
			transactionId: session.id,
			status: PaymentStatus.PENDING,
		},
		include: {
			request: {
				include: {
					service: {
						select: { id: true, name: true, price: true },
					},
				},
			},
		},
	});

	return {
		payment: updatedPayment,
		checkoutUrl: session.url,
	};
};

// Citizen: Confirm payment manually (fallback when the webhook is delayed)

const confirmPayment = async (
	userId: string,
	payload: IConfirmPaymentPayload,
) => {
	const { transactionId } = payload;

	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const payment = await prisma.payment.findFirst({
		where: { transactionId },
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
	}

	if (payment.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to confirm this payment",
		);
	}

	if (payment.status === PaymentStatus.PAID) {
		return prisma.payment.findUnique({
			where: { id: payment.id },
			include: {
				request: {
					include: {
						service: {
							select: { id: true, name: true, price: true },
						},
					},
				},
			},
		});
	}

	if (payment.status !== PaymentStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Payment cannot be confirmed — current status is "${payment.status}"`,
		);
	}

	const session = await stripe.checkout.sessions.retrieve(transactionId);

	if (session.payment_status !== "paid") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Stripe payment is not completed yet",
		);
	}

	const confirmed = await prisma.$transaction(async (tx) => {
		const updated = await tx.payment.updateMany({
			where: { id: payment.id, status: PaymentStatus.PENDING },
			data: {
				status: PaymentStatus.PAID,
				paidAt: new Date(),
				paymentMethod: PaymentMethod.CARD,
				paymentGatewayData: session as unknown as InputJsonValue,
			},
		});

		if (updated.count === 0) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Payment was already processed by another request.",
			);
		}

		const requestId = payment.requestId as string;

		const request = await tx.request.findUnique({ where: { id: requestId } });

		if (request && request.status === RequestStatus.PENDING) {
			await tx.request.update({
				where: { id: requestId },
				data: { status: RequestStatus.SUBMITTED },
			});

			await tx.requestStatusHistory.create({
				data: {
					requestId,
					status: RequestStatus.SUBMITTED,
					previousStatus: RequestStatus.PENDING,
					notes: "Payment received; request submitted",
					changedByUserId: citizen.userId,
				},
			});
		}

		return tx.payment.findUnique({
			where: { id: payment.id },
			include: {
				request: {
					include: {
						service: {
							select: { id: true, name: true, price: true },
						},
					},
				},
			},
		});
	});

	assignmentService
		.assignNextResolver(payment.requestId as string)
		.catch((error) => {
			console.error(
				`Auto-assignment failed for request ${payment.requestId}:`,
				error,
			);
		});

	return confirmed;
};

// Webhook: Handle Stripe Checkout events

const handleStripeWebhook = async (payload: Buffer, signature: string) => {
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			payload,
			signature,
			envVars.STRIPE.STRIPE_WEBHOOK_SECRET,
		);
	} catch (error) {
		console.error("Webhook signature verification failed:", error);
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid webhook signature");
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object as Stripe.Checkout.Session;
			const requestId = session.metadata?.requestId;
			const paymentId = session.metadata?.paymentId;

			if (!requestId || !paymentId) {
				console.error("Missing requestId or paymentId in session metadata");
				return { received: true };
			}

			const existingEventPayment = await prisma.payment.findFirst({
				where: { stripeEventId: event.id },
			});

			if (existingEventPayment) {
				console.log(`Event ${event.id} already processed. Skipping.`);
				return { received: true };
			}

			const payment = await prisma.payment.findUnique({
				where: { id: paymentId },
			});

			if (!payment) {
				console.error(`Payment ${paymentId} not found`);
				return { received: true };
			}

			if (payment.status === PaymentStatus.PAID) {
				console.log(`Payment ${paymentId} is already PAID. Skipping.`);
				return { received: true };
			}

			const citizen = await prisma.citizenProfile.findUnique({
				where: { id: payment.citizenId as string },
			});

			if (!citizen) {
				console.error(`Citizen not found for payment: ${paymentId}`);
				return { received: true };
			}

			// Delayed payment methods may complete the checkout session before the
			// funds are captured, so we guard on payment_status explicitly.
			const isPaid = session.payment_status === "paid";

			await prisma.$transaction(async (tx) => {
				if (isPaid) {
					const request = await tx.request.findUnique({
						where: { id: requestId },
					});

					if (request && request.status === RequestStatus.PENDING) {
						await tx.request.update({
							where: { id: requestId },
							data: { status: RequestStatus.SUBMITTED },
						});

						await tx.requestStatusHistory.create({
							data: {
								requestId,
								status: RequestStatus.SUBMITTED,
								previousStatus: RequestStatus.PENDING,
								notes: "Payment received; request submitted",
								changedByUserId: citizen.userId,
							},
						});
					}

					await tx.payment.update({
						where: { id: paymentId },
						data: {
							stripeEventId: event.id,
							status: PaymentStatus.PAID,
							paidAt: new Date(),
							paymentMethod: PaymentMethod.CARD,
							paymentGatewayData: session as unknown as InputJsonValue,
						},
					});
				} else {
					await tx.payment.update({
						where: { id: paymentId },
						data: {
							stripeEventId: event.id,
							status: PaymentStatus.FAILED,
							paymentGatewayData: session as unknown as InputJsonValue,
						},
					});
				}
			});

			if (isPaid) {
				assignmentService.assignNextResolver(requestId).catch((error) => {
					console.error(
						`Auto-assignment failed for request ${requestId}:`,
						error,
					);
				});
			}

			break;
		}
		case "checkout.session.expired": {
			const session = event.data.object as Stripe.Checkout.Session;
			const paymentId = session.metadata?.paymentId;

			if (paymentId) {
				// Guard on PENDING so a PAID payment is never downgraded to FAILED.
				const updated = await prisma.payment.updateMany({
					where: { id: paymentId, status: PaymentStatus.PENDING },
					data: {
						status: PaymentStatus.FAILED,
						stripeEventId: event.id,
						paymentGatewayData: session as unknown as InputJsonValue,
					},
				});

				if (updated.count > 0) {
					console.log(
						`Marked payment ${paymentId} as FAILED due to expired checkout session.`,
					);
				} else {
					console.log(
						`Payment ${paymentId} was not PENDING (already PAID or FAILED). Skipping expired downgrade.`,
					);
				}
			}

			break;
		}
		default:
			console.log(`Unhandled stripe webhook event type: ${event.type}`);
	}

	return { received: true };
};

const getPaymentByRequestId = async (userId: string, requestId: string) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen profile not found");
	}

	const request = await prisma.request.findUnique({
		where: { id: requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Request not found");
	}

	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this payment",
		);
	}

	const payment = await prisma.payment.findUnique({
		where: { requestId },
		include: {
			service: {
				select: {
					id: true,
					name: true,
					price: true,
					serviceType: true,
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Payment not found for this request",
		);
	}

	return payment;
};

export const paymentService = {
	createPayment,
	confirmPayment,
	handleStripeWebhook,
	getPaymentByRequestId,
};
