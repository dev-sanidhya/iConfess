-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "instagramHandle" TEXT,
    "snapchatHandle" TEXT,
    "primaryCategory" TEXT NOT NULL DEFAULT 'COLLEGE',
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "id", "instagramHandle", "name", "passwordHash", "phone", "snapchatHandle", "updatedAt", "username")
SELECT "createdAt", "id", "instagramHandle", "name", "passwordHash", "phone", "snapchatHandle", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_instagramHandle_key" ON "User"("instagramHandle");
CREATE UNIQUE INDEX "User_snapchatHandle_key" ON "User"("snapchatHandle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
