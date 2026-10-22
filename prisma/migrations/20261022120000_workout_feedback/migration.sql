CREATE TABLE "WorkoutFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutFeedback_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutFeedback_workoutId_requestId_key" ON "WorkoutFeedback"("workoutId", "requestId");
CREATE INDEX "WorkoutFeedback_workoutId_createdAt_idx" ON "WorkoutFeedback"("workoutId", "createdAt");
