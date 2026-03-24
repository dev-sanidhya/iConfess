-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confessionPageUnlocked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "CollegeProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "collegeName" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "yearOfPassing" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "CollegeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "yearOfCompletion" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "SchoolProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkplaceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "WorkplaceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GymProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gymName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "timing" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "GymProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NeighbourhoodProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "premisesName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "NeighbourhoodProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Confession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetId" TEXT,
    "targetPhone" TEXT,
    "message" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "matchDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "repliedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "mutualDetected" BOOLEAN NOT NULL DEFAULT false,
    "senderRevealConsent" BOOLEAN NOT NULL DEFAULT false,
    "targetRevealConsent" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" DATETIME,
    CONSTRAINT "Confession_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Confession_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnlockedCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "confessionId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnlockedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UnlockedCard_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "Confession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeProfile_userId_key" ON "CollegeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProfile_userId_key" ON "SchoolProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkplaceProfile_userId_key" ON "WorkplaceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GymProfile_userId_key" ON "GymProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NeighbourhoodProfile_userId_key" ON "NeighbourhoodProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockedCard_userId_confessionId_key" ON "UnlockedCard"("userId", "confessionId");
