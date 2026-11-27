ALTER TABLE "WorkoutFeedback" ADD COLUMN "completionId" TEXT REFERENCES "WorkoutCompletion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
