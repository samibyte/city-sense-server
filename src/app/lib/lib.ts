import nodemailer from "nodemailer";
import { envVars } from "../config/env.js";

export const transporter = nodemailer.createTransport({
	host: envVars.EMAIL_SENDER.SMTP_HOST,
	port: Number(envVars.EMAIL_SENDER.SMTP_PORT),
	secure: false,
	auth: {
		user: envVars.EMAIL_SENDER.SMTP_USER,
		pass: envVars.EMAIL_SENDER.SMTP_PASS,
	},
});
