CREATE TABLE "WorkoutCompletion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workoutId" TEXT NOT NULL,
  "completedOn" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutCompletion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutCompletion_workoutId_completedOn_key" ON "WorkoutCompletion"("workoutId", "completedOn");
CREATE INDEX "WorkoutCompletion_createdAt_idx" ON "WorkoutCompletion"("createdAt");
