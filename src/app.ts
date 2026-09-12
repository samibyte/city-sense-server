import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import { envVars } from "./app/config/env.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler.js";
import { notFound } from "./app/middleware/notFound.js";
import { adminRouter } from "./app/module/admin/admin.route.js";
import { authRouter } from "./app/module/auth/auth.route.js";
import { departmentRouter } from "./app/module/department/department.route.js";
import {
	paymentRouter,
	paymentWebhookRouter,
} from "./app/module/payment/payment.route.js";
import { requestRouter } from "./app/module/request/request.route.js";
import { resolverRouter } from "./app/module/resolver/resolver.route.js";
import { serviceRouter } from "./app/module/service/service.route.js";
import { userRouter } from "./app/module/user/user.route.js";

const app: Application = express();

app.use(helmet());

app.use(
	cors({
		origin: envVars.FRONTEND_URL,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Stripe webhook needs raw body - mount before JSON parser, scoped to the webhook path only
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));
app.use("/api/v1/payments/webhook", paymentWebhookRouter);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/resolver", resolverRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/requests", requestRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/payments", paymentRouter);

// Basic route
app.get("/", async (_req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "City Sense - System running",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
