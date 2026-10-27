import { z } from "zod";
import { programSchema } from "./validation";
import { workoutSchema } from "./workouts";

export const programRoutineSchema = programSchema.extend({
  sessions: z.string().trim().max(10000).default(""),
  workouts: z.array(workoutSchema).max(30).optional(),
  revision: z.number().int().positive().optional(),
});
