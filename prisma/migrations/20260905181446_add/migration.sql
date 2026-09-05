-- CreateEnum
CREATE TYPE "ResolverVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolvers" (
    "id" TEXT NOT NULL,
    "bio" TEXT,
    "resume" TEXT,
    "resumePublicId" TEXT,
    "additionalFiles" JSONB,
    "verificationStatus" "ResolverVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "resolvers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resolvers_departmentId_key" ON "resolvers"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "resolvers_userId_key" ON "resolvers"("userId");

-- AddForeignKey
ALTER TABLE "resolvers" ADD CONSTRAINT "resolvers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolvers" ADD CONSTRAINT "resolvers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
