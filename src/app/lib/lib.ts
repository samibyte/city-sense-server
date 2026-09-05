import nodemailer from "nodemailer";
import { envVars } from "../config/env";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: envVars.EMAIL_SENDER.SMTP_USER,
		pass: envVars.EMAIL_SENDER.SMTP_PASS,
	},
});
