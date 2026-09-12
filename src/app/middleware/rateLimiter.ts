import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import httpStatus from "http-status";

const createLimiter = (windowMs: number, max: number, message: string) =>
	rateLimit({
		windowMs,
		max,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: ipKeyGenerator,
		message: {
			success: false,
			statusCode: httpStatus.TOO_MANY_REQUESTS,
			message,
			errors: [],
		},
	});

export const authRateLimiter = createLimiter(
	15 * 60 * 1000,
	20,
	"Too many authentication requests, please try again later",
);

export const otpRateLimiter = createLimiter(
	15 * 60 * 1000,
	5,
	"Too many OTP requests, please try again later",
);
