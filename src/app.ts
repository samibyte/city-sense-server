import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import { envVars } from "./app/config/env";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { adminRouter } from "./app/module/admin/admin.route";
import { authRouter } from "./app/module/auth/auth.route";
import { departmentRouter } from "./app/module/department/department.route";
import { requestRouter } from "./app/module/request/request.route";
import { resolverRouter } from "./app/module/resolver/resolver.route";
import { serviceRouter } from "./app/module/service/service.route";

const app: Application = express();

app.use(
	cors({
		origin: envVars.FRONTEND_URL,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/resolver", resolverRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/requests", requestRouter);
app.use("/api/v1/admin", adminRouter);

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
