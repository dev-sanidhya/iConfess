CREATE TYPE "PaymentServiceKey" AS ENUM (
    'SEND_CONFESSION',
    'SELF_CONFESSION',
    'UNLOCK_CONFESSION_CARD',
    'UNLOCK_CONFESSION_PAGE',
    'UNLOCK_PROFILE_INSIGHTS',
    'IDENTITY_REVEAL'
);

CREATE TABLE "PaymentServiceConfig" (
    "id" TEXT NOT NULL,
    "service" "PaymentServiceKey" NOT NULL,
    "amount" INTEGER NOT NULL,
    "qrCodeDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentServiceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentServiceConfig_service_key" ON "PaymentServiceConfig"("service");
