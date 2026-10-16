-- CreateTable
CREATE TABLE "EnrollmentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personalId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnrollmentLink_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnrollmentChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "linkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "EnrollmentChallenge_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "EnrollmentLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnrollmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personalId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "healthPayload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "studentId" TEXT,
    "policyVersion" TEXT NOT NULL,
    "consentAt" DATETIME NOT NULL,
    "healthConsentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnrollmentRequest_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnrollmentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnrollmentEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EnrollmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLink_personalId_key" ON "EnrollmentLink"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLink_token_key" ON "EnrollmentLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_studentId_key" ON "EnrollmentRequest"("studentId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_personalId_status_createdAt_idx" ON "EnrollmentRequest"("personalId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_personalId_emailHash_key" ON "EnrollmentRequest"("personalId", "emailHash");
