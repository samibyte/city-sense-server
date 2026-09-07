import app from "./app";
import { envVars } from "./app/config/env";
import { transporter } from "./app/lib/lib";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis-client";

const PORT = Number(envVars.PORT);

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await redisClient.connect();
		console.log("Redis Connected successfully.");

		await transporter.verify();
		console.log("Nodemailer connected successfully");

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

if (process.env.NODE_ENV === "development") {
	main();
}

export default app;