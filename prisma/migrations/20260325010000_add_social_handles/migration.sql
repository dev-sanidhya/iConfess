-- AlterTable
ALTER TABLE "User" ADD COLUMN "instagramHandle" TEXT;
ALTER TABLE "User" ADD COLUMN "snapchatHandle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_instagramHandle_key" ON "User"("instagramHandle");

-- CreateIndex
CREATE UNIQUE INDEX "User_snapchatHandle_key" ON "User"("snapchatHandle");
