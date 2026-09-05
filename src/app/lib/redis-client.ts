import { createClient } from "redis";
import { envVars } from "../config/env";

export const redisClient = createClient({
	username: envVars.REDIS.USER,
	password: envVars.REDIS.PASS,
	socket: {
		host: envVars.REDIS.HOST,
		port: Number(envVars.REDIS.PORT),
	},
});
