import Stripe from "stripe";
import { envVars } from "../config/env.js";

export const stripe = new Stripe(envVars.STRIPE.STRIPE_SECRET_KEY, {
	apiVersion: "2026-08-26.dahlia",
});
