import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { userRepository } from "../module/repositories/user.repository";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const basePrisma = new PrismaClient({ adapter });

const prisma = basePrisma.$extends(userRepository);

export type ExtendedPrismaClient = typeof prisma;
export { prisma };
