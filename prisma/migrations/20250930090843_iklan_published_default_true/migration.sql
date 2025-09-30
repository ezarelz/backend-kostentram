-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Iklan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "addressLine" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "areaSqm" INTEGER,
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "facilitiesCsv" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Iklan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Iklan" ("addressLine", "areaSqm", "bathrooms", "body", "city", "createdAt", "facilitiesCsv", "id", "ownerId", "postalCode", "price", "province", "published", "rooms", "title", "updatedAt") SELECT "addressLine", "areaSqm", "bathrooms", "body", "city", "createdAt", "facilitiesCsv", "id", "ownerId", "postalCode", "price", "province", "published", "rooms", "title", "updatedAt" FROM "Iklan";
DROP TABLE "Iklan";
ALTER TABLE "new_Iklan" RENAME TO "Iklan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
