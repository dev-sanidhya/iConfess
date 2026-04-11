-- AlterTable
ALTER TABLE "OtpSession"
ADD COLUMN "requestIp" TEXT;

-- CreateIndex
CREATE INDEX "OtpSession_requestIp_createdAt_idx"
ON "OtpSession"("requestIp", "createdAt");
