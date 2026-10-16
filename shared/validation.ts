import { z } from "zod";
import { technicalCriteria } from "./questionnaire";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida")
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
const text = z.string().trim().max(10000);
const optionalText = text.default("");
const optionalDate = z
  .union([dateSchema, z.literal("")])
  .nullable()
  .optional()
  .transform((v) => v || null);
export const studentSchema = z
  .object({
    name: z.string().trim().min(3, "Informe o nome completo").max(160),
    birthDate: optionalDate,
    phone: z.string().trim().max(40).default(""),
    email: z.union([z.email(), z.literal("")]).default(""),
    sex: optionalText,
    startDate: dateSchema,
    status: z.enum(["ativo", "pausado", "inativo"]).default("ativo"),
    mainGoal: text.min(3, "Informe o objetivo"),
    secondaryGoals: optionalText,
    experience: optionalText,
    weeklyFrequency: z.coerce.number().int().min(1).max(14).default(3),
    availability: optionalText,
    notes: optionalText,
    injuries: optionalText,
    limitations: optionalText,
    surgeries: optionalText,
    conditions: optionalText,
    medications: optionalText,
    restrictions: optionalText,
    emergencyContact: optionalText,
    nextEvaluationDate: optionalDate,
    programId: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v || null),
  })
  .refine(
    (s) => !s.birthDate || s.birthDate <= new Date().toISOString().slice(0, 10),
    {
      path: ["birthDate"],
      message: "Nascimento não pode estar no futuro",
    },
  );
export const programSchema = z.object({
  name: text.min(3).max(160),
  description: optionalText,
  weeklyFrequency: z.coerce.number().int().min(1).max(14),
  cycleDays: z.coerce.number().int().min(1).max(365),
  sessions: text.min(3),
});
export const templateSchema = z.object({
  name: text.min(3).max(160),
  cycleDays: z.number().int().min(1).max(365),
  questions: z
    .array(
      z
        .object({
          dimension: text.min(1),
          text: text.min(1),
          type: z.enum(["choice", "text", "number", "scale"]),
          required: z.boolean().default(true),
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
          options: z.array(z.object({ label: text.min(1) })).default([]),
        })
        .superRefine((q, ctx) => {
          if (q.type === "choice" && q.options.length < 2)
            ctx.addIssue({
              code: "custom",
              message: "Perguntas objetivas precisam de pelo menos duas opções",
            });
          if (q.type !== "choice" && q.options.length)
            ctx.addIssue({
              code: "custom",
              message: "Opções somente em perguntas objetivas",
            });
          if (q.type === "scale" && (q.min == null || q.max == null))
            ctx.addIssue({
              code: "custom",
              message: "Escalas precisam de limites",
            });
          if (q.min != null && q.max != null && q.min > q.max)
            ctx.addIssue({ code: "custom", message: "Limites invertidos" });
          if (new Set(q.options.map((o) => o.label)).size !== q.options.length)
            ctx.addIssue({ code: "custom", message: "Opções duplicadas" });
        }),
    )
    .min(1)
    .max(100),
});
export const evaluationSchema = z.object({
  templateId: z.string().min(1),
  date: dateSchema,
  cycle: z.coerce.number().int().min(1),
  evaluator: text.min(2),
  programId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v || null),
  status: z.enum(["rascunho", "concluida"]),
  notes: optionalText,
  conclusion: optionalText,
  actionPlan: optionalText,
  answers: z
    .array(z.object({ questionId: z.string(), value: z.string().max(10000) }))
    .max(100),
});
const nonnegative = z.number().finite().min(0);
export const monthlySchema = z.object({
  cycle: z.number().int().min(1),
  planned: nonnegative.int(),
  completed: nonnegative.int(),
  rpe: z.number().min(0).max(10).nullable(),
  cardioMinutes: nonnegative,
  notes: optionalText,
});
export const physicalSchema = z
  .object({
    weight: z.number().positive().max(1000).nullable(),
    waist: z.number().positive().max(500).nullable(),
    notes: optionalText,
  })
  .refine(
    (v) => v.weight !== null || v.waist !== null || v.notes.length > 0,
    "Registre ao menos uma medida ou observação",
  );
export const trainingSchema = z.object({
  title: text.min(2),
  status: z.enum(["previsto", "realizado", "ausente"]),
  focus: text.min(1),
  duration: nonnegative.nullable(),
  rpe: z.number().min(0).max(10).nullable(),
  exercises: optionalText,
  exerciseName: optionalText,
  loadKg: nonnegative.nullable().default(null),
  repetitions: nonnegative.int().nullable().default(null),
  distanceKm: nonnegative.nullable().default(null),
  notes: optionalText,
});
export const technicalSchema = z.object({
  criteria: z
    .array(
      z.object({
        criterion: z.enum(technicalCriteria as [string, ...string[]]),
        observation: optionalText,
        initial: optionalText,
        current: optionalText,
        nextAction: optionalText,
      }),
    )
    .length(13)
    .refine(
      (v) => new Set(v.map((x) => x.criterion)).size === 13,
      "Todos os critérios devem aparecer uma vez",
    ),
  notes: optionalText,
});
export const socialSchema = z.object({
  environment: optionalText,
  confidence: optionalText,
  autonomy: optionalText,
  motivation: optionalText,
  sleep: optionalText,
  notes: text.min(1),
});
export const noteSchema = z.object({ notes: text.min(1) });
export const recordSchemas = {
  monthly: monthlySchema,
  physical: physicalSchema,
  training: trainingSchema,
  technical: technicalSchema,
  social: socialSchema,
  note: noteSchema,
};
export type RecordKind = keyof typeof recordSchemas;
export const recordSchema = z.object({
  kind: z.enum([
    "monthly",
    "physical",
    "training",
    "technical",
    "social",
    "note",
  ]),
  date: dateSchema,
  data: z.unknown(),
});
export function adherence(planned: number, completed: number) {
  return planned === 0 ? null : Math.round((completed / planned) * 1000) / 10;
}
