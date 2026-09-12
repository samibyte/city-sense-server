import { createClient, type SetOptions } from "redis";
import { envVars } from "../config/env.js";

const createRedisClient = () => {
	const client = createClient({
		username: envVars.REDIS.USER,
		password: envVars.REDIS.PASS,
		socket: {
			host: envVars.REDIS.HOST,
			port: Number(envVars.REDIS.PORT),
			reconnectStrategy: (retries) => Math.min(retries * 100, 2000),
		},
		pingInterval: 30_000,
	});

	client.on("error", (error) => {
		console.error("Redis client error:", error);
	});

	return client;
};

let redisClient = createRedisClient();

let connectionPromise: Promise<void> | null = null;

export const ensureRedisConnection = async () => {
	if (redisClient.isReady) return;
	if (connectionPromise) return connectionPromise;

	connectionPromise = (async () => {
		if (!redisClient.isOpen) {
			await redisClient.connect();
		}

		if (!redisClient.isReady) {
			await redisClient.ping();
		}
	})().finally(() => {
		connectionPromise = null;
	});

	return connectionPromise;
};

const isClosedClientError = (error: unknown) =>
	error instanceof Error &&
	(error.name === "ClientClosedError" ||
		error.name === "SocketClosedUnexpectedlyError" ||
		error.message.toLowerCase().includes("client is closed"));

const resetRedisClient = () => {
	if (redisClient.isOpen) {
		redisClient.destroy();
	}

	redisClient = createRedisClient();
};

const executeRedisCommand = async <T>(command: () => Promise<T>) => {
	await ensureRedisConnection();

	try {
		return await command();
	} catch (error) {
		if (!isClosedClientError(error)) throw error;

		resetRedisClient();
		await ensureRedisConnection();
		return command();
	}
};

export const redisSet = (key: string, value: string, options: SetOptions) =>
	executeRedisCommand(() => redisClient.set(key, value, options));

export const redisGet = (key: string) =>
	executeRedisCommand(() => redisClient.get(key));

export const redisDel = (key: string) =>
	executeRedisCommand(() => redisClient.del(key));
