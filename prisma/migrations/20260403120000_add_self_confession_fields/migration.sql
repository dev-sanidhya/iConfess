-- CreateEnum
CREATE TYPE "ConfessionBillingCategory" AS ENUM ('CONFESSION_TO_OTHERS', 'CONFESSION_TO_YOURSELF');

-- CreateEnum
CREATE TYPE "ConfessionBillingState" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "Confession"
ADD COLUMN "isSelfConfession" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "billingCategory" "ConfessionBillingCategory" NOT NULL DEFAULT 'CONFESSION_TO_OTHERS',
ADD COLUMN "billingState" "ConfessionBillingState" NOT NULL DEFAULT 'PAID',
ADD COLUMN "selfGenderOverride" "Gender";
