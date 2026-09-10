import nodemailer from "nodemailer";
import { envVars } from "../config/env.js";

const smtpPort = Number(envVars.EMAIL_SENDER.SMTP_PORT) || 465;
const smtpSecure = envVars.EMAIL_SENDER.SMTP_SECURE === "true";

export const transporter = nodemailer.createTransport({
	host: envVars.EMAIL_SENDER.SMTP_HOST,
	port: smtpPort,
	secure: smtpSecure,
	auth: {
		user: envVars.EMAIL_SENDER.SMTP_USER,
		pass: envVars.EMAIL_SENDER.SMTP_PASS,
	},
});
