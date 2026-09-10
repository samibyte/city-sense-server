import { OAuth2Client } from "google-auth-library";
import { envVars } from "../config/env.js";

const googleClient = new OAuth2Client({
	client_id: envVars.GOOGLE_CLIENT_ID,
});

export { googleClient };
