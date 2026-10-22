ALTER TABLE "WorkoutExercise" ADD COLUMN "series" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE "PrescriptionPreset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "series" JSONB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrescriptionPreset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PrescriptionPreset_ownerId_idx" ON "PrescriptionPreset"("ownerId");
