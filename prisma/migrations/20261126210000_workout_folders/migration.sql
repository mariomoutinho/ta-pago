CREATE TABLE "WorkoutFolder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutFolder_ownerId_name_key" ON "WorkoutFolder"("ownerId", "name");
ALTER TABLE "WorkoutTemplate" ADD COLUMN "folderId" TEXT REFERENCES "WorkoutFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
