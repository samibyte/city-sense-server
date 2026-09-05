/*
  Warnings:

  - The values [SUPER_ADMIN,STAFF] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `departmentId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'RESOLVER', 'CITIZEN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CITIZEN';
COMMIT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "departmentId",
DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "citizens" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citizens_userId_key" ON "citizens"("userId");

-- CreateIndex
CREATE INDEX "idx_citizen_isDeleted" ON "citizens"("isDeleted");

-- AddForeignKey
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
