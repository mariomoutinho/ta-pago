ALTER TABLE "WorkoutExercise" ADD COLUMN "alternativeExerciseId" TEXT REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionPreset" ADD COLUMN "configuration" JSONB;
UPDATE "WorkoutTemplate" SET "exercises" = (SELECT json_group_array(json(json_set(value, '$.clientId', coalesce(json_extract(value, '$.clientId'), lower(hex(randomblob(16))))))) FROM json_each("WorkoutTemplate"."exercises"));
