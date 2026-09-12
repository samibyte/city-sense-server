/*
  Warnings:

  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `city` to the `resolvers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "requestPayload" JSONB,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ALTER COLUMN "transactionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "autoAssigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "resolvers" ADD COLUMN     "area" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "maxConcurrentAssignments" INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "idx_payment_stripe_intent" ON "payments"("stripePaymentIntentId");
