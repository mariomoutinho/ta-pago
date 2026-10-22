import { z } from "zod";
import { dateSchema } from "./validation";
const text = z.string().trim().max(10000).default("");
const name = z.string().trim().min(1, "Informe o nome").max(160);
const url = z
  .union([
    z.literal(""),
    z.url().refine((v) => /^https?:\/\//i.test(v), "Use URL http ou https"),
  ])
  .default("");
const number = z
  .number()
  .finite()
  .min(0, "Não use números negativos")
  .max(1000000)
  .nullable()
  .default(null);
export const exerciseSchema = z.object({
  name,
  muscleGroup: name,
  category: name,
  equipment: text,
  description: text,
  imageUrl: url,
  videoUrl: url,
  notes: text,
  status: z.enum(["ativo", "arquivado"]).default("ativo"),
});
export const prescriptionSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1),
  sets: number.refine(
    (v) => v === null || Number.isInteger(v),
    "Séries devem ser inteiras",
  ),
  repetitions: z
    .string()
    .trim()
    .max(100)
    .regex(/^(?:\d+(?:\s*[-–]\s*\d+)?)?$/, "Use repetições como 10 ou 8-12")
    .default(""),
  load: number,
  durationSeconds: number.refine((v) => v === null || Number.isInteger(v)),
  restSeconds: number.refine((v) => v === null || Number.isInteger(v)),
  rir: number.refine((v) => v === null || v <= 10),
  rpe: number.refine((v) => v === null || v <= 10),
  cadence: text,
  notes: text,
});
export const workoutSchema = z.object({
  id: z.string().optional(),
  name,
  subtitle: text,
  instructions: text,
  exercises: z.array(prescriptionSchema).max(100).default([]),
});
export const planSchema = z
  .object({
    title: name,
    objective: name,
    difficulty: z.enum(["Iniciante", "Intermediário", "Avançado"]),
    startsAt: dateSchema,
    endsAt: z
      .union([dateSchema, z.literal(""), z.null()])
      .default(null)
      .transform((v) => v || null),
    instructions: text,
    status: z.enum(["rascunho", "ativo", "arquivado"]).default("rascunho"),
    revision: z.number().int().positive().optional(),
    workouts: z.array(workoutSchema).max(30).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.endsAt && p.endsAt < p.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Término anterior ao início",
      });
    if (
      p.status === "ativo" &&
      (!p.workouts.length || p.workouts.some((w) => !w.exercises.length))
    )
      ctx.addIssue({
        code: "custom",
        message: "Adicione treinos com exercícios antes de ativar",
      });
    const ids = [
      ...p.workouts.flatMap((w) => (w.id ? [w.id] : [])),
      ...p.workouts.flatMap((w) =>
        w.exercises.flatMap((e) => (e.id ? [e.id] : [])),
      ),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Itens duplicados" });
  });
export type ExerciseData = z.infer<typeof exerciseSchema>;
export type Exercise = ExerciseData & { id: string };
export type Prescription = z.infer<typeof prescriptionSchema> & {
  exercise?: Exercise;
};
export type WorkoutData = Omit<z.infer<typeof workoutSchema>, "exercises"> & {
  exercises: Prescription[];
  feedbacks?: WorkoutFeedback[];
};
export type PlanData = Omit<z.infer<typeof planSchema>, "workouts"> & {
  workouts: WorkoutData[];
};
export type Plan = PlanData & {
  id: string;
  studentId: string;
  publishedAt: string | null;
  student?: { name: string; linkStatus?: string; personal: { name: string } };
};

export const workoutFeedbackSchema = z.object({
  requestId: z.string().trim().min(8).max(100),
  comment: z.string().trim().min(1, "Escreva seu feedback").max(2000, "Use até 2000 caracteres"),
});
export type WorkoutFeedback = { id: string; comment: string; createdAt: string };
