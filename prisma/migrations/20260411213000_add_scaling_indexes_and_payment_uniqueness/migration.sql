-- Hot-path indexes for auth, dashboard, and confession lookup flows.
CREATE INDEX IF NOT EXISTS "Confession_senderId_createdAt_idx"
ON "Confession"("senderId", "createdAt");

CREATE INDEX IF NOT EXISTS "Confession_targetId_createdAt_idx"
ON "Confession"("targetId", "createdAt");

CREATE INDEX IF NOT EXISTS "Confession_senderId_targetId_isSelfConfession_idx"
ON "Confession"("senderId", "targetId", "isSelfConfession");

CREATE INDEX IF NOT EXISTS "Confession_targetId_status_createdAt_idx"
ON "Confession"("targetId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Confession_status_createdAt_idx"
ON "Confession"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Confession_targetPhone_idx"
ON "Confession"("targetPhone");

CREATE INDEX IF NOT EXISTS "Confession_expiresAt_idx"
ON "Confession"("expiresAt");

CREATE INDEX IF NOT EXISTS "OtpSession_phone_createdAt_idx"
ON "OtpSession"("phone", "createdAt");

CREATE INDEX IF NOT EXISTS "OtpSession_phone_verified_createdAt_idx"
ON "OtpSession"("phone", "verified", "createdAt");

CREATE INDEX IF NOT EXISTS "OtpSession_phone_verified_expiresAt_idx"
ON "OtpSession"("phone", "verified", "expiresAt");

CREATE INDEX IF NOT EXISTS "Payment_userId_status_createdAt_idx"
ON "Payment"("userId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Payment_gateway_gatewayTransactionId_key'
  ) THEN
    ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_gateway_gatewayTransactionId_key"
    UNIQUE ("gateway", "gatewayTransactionId");
  END IF;
END $$;
