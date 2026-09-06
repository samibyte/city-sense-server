/*
  Warnings:

  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('COMPLAINT', 'SERVICE_REQUEST');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'REASSIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'NET_BANKING', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('FREE', 'PAID');

-- DropForeignKey
ALTER TABLE "resolvers" DROP CONSTRAINT "resolvers_departmentId_fkey";

-- DropIndex
DROP INDEX "resolvers_departmentId_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Department";

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority",
    "assignedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "previousAssignmentId" TEXT,
    "reassignedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,
    "resolverId" TEXT NOT NULL,
    "assignedByAdminId" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "resolverId" TEXT NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" TEXT,
    "longitude" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "paymentProvider" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT,
    "citizenId" TEXT,
    "serviceId" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestAttachment" JSONB,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "Priority",
    "slaDeadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedResolverId" TEXT,
    "assignedByAdminId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "citizenId" TEXT NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "previousStatus" "RequestStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "estimatedDuration" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'FREE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assignment_request" ON "assignments"("requestId");

-- CreateIndex
CREATE INDEX "idx_assignment_resolver" ON "assignments"("resolverId");

-- CreateIndex
CREATE INDEX "idx_assignment_status" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "idx_assignment_created_at" ON "assignments"("createdAt");

-- CreateIndex
CREATE INDEX "idx_department_name" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_requestId_key" ON "feedbacks"("requestId");

-- CreateIndex
CREATE INDEX "idx_feedback_citizen" ON "feedbacks"("citizenId");

-- CreateIndex
CREATE INDEX "idx_feedback_resolver" ON "feedbacks"("resolverId");

-- CreateIndex
CREATE INDEX "idx_feedback_rating" ON "feedbacks"("rating");

-- CreateIndex
CREATE INDEX "idx_location_city_area" ON "locations"("city", "area");

-- CreateIndex
CREATE UNIQUE INDEX "payments_requestId_key" ON "payments"("requestId");

-- CreateIndex
CREATE INDEX "idx_payment_citizen" ON "payments"("citizenId");

-- CreateIndex
CREATE INDEX "idx_payment_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");

-- CreateIndex
CREATE INDEX "idx_request_status" ON "requests"("status");

-- CreateIndex
CREATE INDEX "idx_request_citizen" ON "requests"("citizenId");

-- CreateIndex
CREATE INDEX "idx_request_assigned_resolver" ON "requests"("assignedResolverId");

-- CreateIndex
CREATE INDEX "idx_request_number" ON "requests"("requestNumber");

-- CreateIndex
CREATE INDEX "idx_request_category" ON "requests"("categoryId");

-- CreateIndex
CREATE INDEX "idx_request_created_at" ON "requests"("createdAt");

-- CreateIndex
CREATE INDEX "idx_status_history_request" ON "request_status_history"("requestId");

-- CreateIndex
CREATE INDEX "idx_status_history_user" ON "request_status_history"("changedByUserId");

-- CreateIndex
CREATE INDEX "idx_status_history_created_at" ON "request_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "idx_service_department" ON "services"("departmentId");

-- CreateIndex
CREATE INDEX "idx_service_category" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "idx_service_category_department" ON "service_categories"("departmentId");

-- CreateIndex
CREATE INDEX "idx_service_category_name" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "idx_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_status" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_previousAssignmentId_fkey" FOREIGN KEY ("previousAssignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_reassignedByAdminId_fkey" FOREIGN KEY ("reassignedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "resolvers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "resolvers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolvers" ADD CONSTRAINT "resolvers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
