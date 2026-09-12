-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'PENDING';

-- DropIndex
DROP INDEX "idx_payment_stripe_intent";

-- DropIndex
DROP INDEX "payments_stripePaymentIntentId_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "requestPayload",
DROP COLUMN "stripePaymentIntentId",
ADD COLUMN     "paymentGatewayData" JSONB,
ADD COLUMN     "stripeEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeEventId_key" ON "payments"("stripeEventId");

-- CreateIndex
CREATE INDEX "idx_payment_transaction" ON "payments"("transactionId");