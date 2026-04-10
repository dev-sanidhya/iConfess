-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'SNAPCHAT');

-- CreateTable
CREATE TABLE "PendingSocialOwnershipRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "submittedHandle" TEXT NOT NULL,
    "normalizedHandle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingSocialOwnershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSocialOwnershipRequest_userId_platform_key" ON "PendingSocialOwnershipRequest"("userId", "platform");

-- CreateIndex
CREATE INDEX "PendingSocialOwnershipRequest_platform_normalizedHandle_idx" ON "PendingSocialOwnershipRequest"("platform", "normalizedHandle");

-- AddForeignKey
ALTER TABLE "PendingSocialOwnershipRequest" ADD CONSTRAINT "PendingSocialOwnershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
