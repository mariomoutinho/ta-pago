/*
  Warnings:

  - Added the required column `ownerId` to the `Program` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personalId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvaluationTemplate" (
    "ownerId" TEXT NOT NULL DEFAULT 'system',
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_EvaluationTemplate" ("createdAt", "cycleDays", "id", "name", "version") SELECT "createdAt", "cycleDays", "id", "name", "version" FROM "EvaluationTemplate";
DROP TABLE "EvaluationTemplate";
ALTER TABLE "new_EvaluationTemplate" RENAME TO "EvaluationTemplate";
CREATE UNIQUE INDEX "EvaluationTemplate_name_version_ownerId_key" ON "EvaluationTemplate"("name", "version", "ownerId");
CREATE TABLE "new_Program" (
    "ownerId" TEXT NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weeklyFrequency" INTEGER NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 30,
    "sessions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Program_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Program" ("createdAt", "cycleDays", "description", "id", "name", "sessions", "weeklyFrequency") SELECT "createdAt", "cycleDays", "description", "id", "name", "sessions", "weeklyFrequency" FROM "Program";
DROP TABLE "Program";
ALTER TABLE "new_Program" RENAME TO "Program";
CREATE TABLE "new_Student" (
    "personalId" TEXT NOT NULL,
    "accountId" TEXT,
    "linkStatus" TEXT NOT NULL DEFAULT 'unlinked',
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "birthDate" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "sex" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "mainGoal" TEXT NOT NULL,
    "secondaryGoals" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "weeklyFrequency" INTEGER NOT NULL DEFAULT 3,
    "availability" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "injuries" TEXT NOT NULL DEFAULT '',
    "limitations" TEXT NOT NULL DEFAULT '',
    "surgeries" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '',
    "medications" TEXT NOT NULL DEFAULT '',
    "restrictions" TEXT NOT NULL DEFAULT '',
    "emergencyContact" TEXT NOT NULL DEFAULT '',
    "nextEvaluationDate" TEXT,
    "programId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("availability", "birthDate", "conditions", "createdAt", "email", "emergencyContact", "experience", "id", "injuries", "limitations", "mainGoal", "medications", "name", "nextEvaluationDate", "notes", "phone", "programId", "restrictions", "secondaryGoals", "sex", "startDate", "status", "surgeries", "updatedAt", "weeklyFrequency") SELECT "availability", "birthDate", "conditions", "createdAt", "email", "emergencyContact", "experience", "id", "injuries", "limitations", "mainGoal", "medications", "name", "nextEvaluationDate", "notes", "phone", "programId", "restrictions", "secondaryGoals", "sex", "startDate", "status", "surgeries", "updatedAt", "weeklyFrequency" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'personal',
    "passwordHash" TEXT NOT NULL
);
INSERT INTO "new_User" ("email", "id", "name", "passwordHash") SELECT "email", "id", "name", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
