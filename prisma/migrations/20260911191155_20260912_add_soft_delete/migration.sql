/*
  Warnings:

  - Added the required column `updatedAt` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `service_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "idx_department_isDeleted" ON "departments"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_service_category_isDeleted" ON "service_categories"("isDeleted");
