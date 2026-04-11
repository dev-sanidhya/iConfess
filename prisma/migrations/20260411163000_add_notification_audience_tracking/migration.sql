-- CreateEnum
CREATE TYPE "NotificationAudienceCategory" AS ENUM (
    'UNREGISTERED_PHONE_SEARCH',
    'LOCKED_CONFESSION_RECIPIENT',
    'PENDING_MUTUAL_REVEAL'
);

-- CreateTable
CREATE TABLE "NotificationAudienceCounter" (
    "id" TEXT NOT NULL,
    "category" "NotificationAudienceCategory" NOT NULL,
    "subjectUserId" TEXT,
    "subjectPhone" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationAudienceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationAudienceCounterChange" (
    "id" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "previousCount" INTEGER NOT NULL,
    "nextCount" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAudienceCounterChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationAudienceCounter_category_subjectUserId_key"
ON "NotificationAudienceCounter"("category", "subjectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationAudienceCounter_category_subjectPhone_key"
ON "NotificationAudienceCounter"("category", "subjectPhone");

-- CreateIndex
CREATE INDEX "NotificationAudienceCounter_category_idx"
ON "NotificationAudienceCounter"("category");

-- CreateIndex
CREATE INDEX "NotificationAudienceCounterChange_counterId_changedAt_idx"
ON "NotificationAudienceCounterChange"("counterId", "changedAt");

-- AddForeignKey
ALTER TABLE "NotificationAudienceCounter"
ADD CONSTRAINT "NotificationAudienceCounter_subjectUserId_fkey"
FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationAudienceCounterChange"
ADD CONSTRAINT "NotificationAudienceCounterChange_counterId_fkey"
FOREIGN KEY ("counterId") REFERENCES "NotificationAudienceCounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
