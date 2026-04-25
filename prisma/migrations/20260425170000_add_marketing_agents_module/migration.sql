-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'MARKETING_AGENT';

-- CreateTable
CREATE TABLE "MarketingAgentProfile" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "contactLimit" INTEGER NOT NULL,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingAgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingGlobalTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingGlobalTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAgentTag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceGlobalTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingAgentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContact" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "notes" TEXT,
    "confessionsSent" INTEGER NOT NULL DEFAULT 0,
    "lockedReceivedConfessions" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContactTag" (
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "MarketingContactTag_pkey" PRIMARY KEY ("contactId","tagId")
);

-- CreateTable
CREATE TABLE "MarketingContactEditLog" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedKeys" TEXT[],
    CONSTRAINT "MarketingContactEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingRevenueSnapshot" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL,
    "agentShareAmount" DOUBLE PRECISION NOT NULL,
    "purchaseType" "PaymentType" NOT NULL,
    "purchaseCreatedAt" TIMESTAMP(3) NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingRevenueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAgentProfile_staffUserId_key" ON "MarketingAgentProfile"("staffUserId");
CREATE UNIQUE INDEX "MarketingAgentProfile_agentId_key" ON "MarketingAgentProfile"("agentId");
CREATE UNIQUE INDEX "MarketingGlobalTag_name_key" ON "MarketingGlobalTag"("name");
CREATE UNIQUE INDEX "MarketingAgentTag_profileId_name_key" ON "MarketingAgentTag"("profileId", "name");
CREATE INDEX "MarketingAgentTag_profileId_idx" ON "MarketingAgentTag"("profileId");
CREATE UNIQUE INDEX "MarketingContact_phoneNormalized_key" ON "MarketingContact"("phoneNormalized");
CREATE INDEX "MarketingContact_profileId_isDeleted_idx" ON "MarketingContact"("profileId", "isDeleted");
CREATE INDEX "MarketingContact_userId_idx" ON "MarketingContact"("userId");
CREATE INDEX "MarketingContactTag_tagId_idx" ON "MarketingContactTag"("tagId");
CREATE INDEX "MarketingContactEditLog_contactId_changedAt_idx" ON "MarketingContactEditLog"("contactId", "changedAt");
CREATE UNIQUE INDEX "MarketingRevenueSnapshot_paymentId_key" ON "MarketingRevenueSnapshot"("paymentId");
CREATE INDEX "MarketingRevenueSnapshot_profileId_purchaseCreatedAt_idx" ON "MarketingRevenueSnapshot"("profileId", "purchaseCreatedAt");
CREATE INDEX "MarketingRevenueSnapshot_profileId_monthKey_idx" ON "MarketingRevenueSnapshot"("profileId", "monthKey");
CREATE INDEX "MarketingRevenueSnapshot_contactId_idx" ON "MarketingRevenueSnapshot"("contactId");

-- AddForeignKey
ALTER TABLE "MarketingAgentProfile" ADD CONSTRAINT "MarketingAgentProfile_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAgentTag" ADD CONSTRAINT "MarketingAgentTag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketingAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAgentTag" ADD CONSTRAINT "MarketingAgentTag_sourceGlobalTagId_fkey" FOREIGN KEY ("sourceGlobalTagId") REFERENCES "MarketingGlobalTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingContact" ADD CONSTRAINT "MarketingContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketingAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingContact" ADD CONSTRAINT "MarketingContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingContactTag" ADD CONSTRAINT "MarketingContactTag_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MarketingContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingContactTag" ADD CONSTRAINT "MarketingContactTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MarketingAgentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingContactEditLog" ADD CONSTRAINT "MarketingContactEditLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MarketingContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingRevenueSnapshot" ADD CONSTRAINT "MarketingRevenueSnapshot_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingRevenueSnapshot" ADD CONSTRAINT "MarketingRevenueSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketingAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingRevenueSnapshot" ADD CONSTRAINT "MarketingRevenueSnapshot_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MarketingContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingRevenueSnapshot" ADD CONSTRAINT "MarketingRevenueSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
