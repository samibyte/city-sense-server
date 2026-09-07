import nodemailer from "nodemailer";
import { envVars } from "../config/env.js";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: envVars.EMAIL_SENDER.SMTP_USER,
		pass: envVars.EMAIL_SENDER.SMTP_PASS,
	},
});
