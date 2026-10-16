import { z } from "zod";
export const enrollmentGoals = [
  "Emagrecimento",
  "Hipertrofia",
  "Condicionamento físico",
  "Saúde e qualidade de vida",
  "Mobilidade e flexibilidade",
  "Melhora do desempenho esportivo",
  "Criação de hábitos saudáveis",
  "Outro",
] as const;
export const policyVersion = "2026-10-16.v1";
export const enrollmentStatus = {
  pending: "Pendente",
  active: "Ativo",
  rejected: "Recusado",
  inactive: "Inativo",
} as const;
const text = z.string().trim().max(1500).default("");
export const enrollmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo")
      .max(120)
      .refine((v) => v.split(/\s+/).length > 1, "Informe nome e sobrenome"),
    email: z
      .email("Informe um e-mail válido")
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(25)
      .refine(
        (v) =>
          /^\+?[\d\s().-]+$/.test(v) &&
          v.replace(/\D/g, "").length >= 10 &&
          v.replace(/\D/g, "").length <= 15,
        "Informe WhatsApp com DDD",
      ),
    birthDate: z
      .string()
      .default("")
      .refine(
        (v) =>
          !v ||
          (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
            !isNaN(Date.parse(v)) &&
            new Date(v).toISOString().slice(0, 10) === v &&
            v < new Date().toISOString().slice(0, 10) &&
            v >= "1900-01-01"),
        "Data de nascimento inválida",
      ),
    city: z.string().trim().max(100).default(""),
    state: z.string().trim().max(40).default(""),
    gender: z
      .enum(["Não informar", "Feminino", "Masculino", "Outro"])
      .default("Não informar"),
    goals: z
      .array(z.enum(enrollmentGoals))
      .min(1, "Selecione pelo menos um objetivo")
      .max(8)
      .transform((v) => [...new Set(v)]),
    specificGoals: text,
    practicing: z.enum(["Sim", "Não"]),
    daysPerWeek: z.number().int().min(0).max(7),
    experienceDuration: text,
    previousTrainer: z.enum(["Sim", "Não"]),
    preferredActivity: text,
    availability: z
      .string()
      .trim()
      .min(2, "Informe sua disponibilidade")
      .max(1500),
    health: z.object({ restrictions: text, injuries: text, adaptations: text }),
    consent: z.literal(true, {
      error: "É necessário autorizar o envio da ficha",
    }),
    healthConsent: z.boolean(),
    policyVersion: z.literal(policyVersion),
  })
  .superRefine((v, ctx) => {
    if (Object.values(v.health).some(Boolean) && !v.healthConsent)
      ctx.addIssue({
        code: "custom",
        path: ["healthConsent"],
        message:
          "Autorize o envio dos dados de saúde ou remova essas informações",
      });
  });
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type EnrollmentDraft = Omit<EnrollmentInput, "consent"> & {
  consent: boolean;
};
export type EnrollmentSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  goals: string[];
  status: keyof typeof enrollmentStatus;
  createdAt: string;
  studentId: string | null;
};
export type EnrollmentDetail = EnrollmentSummary & {
  form: EnrollmentInput;
  policyVersion: string;
  consentAt: string;
  healthConsentAt: string | null;
  events: { status: keyof typeof enrollmentStatus; createdAt: string }[];
};
export type LinkInfo = {
  token: string;
  url: string;
  active: boolean;
  publicName: string;
  contact: string;
  local: boolean;
  received: number;
};
export type PublicEnrollment = {
  personalName: string;
  contact: string;
  policyVersion: string;
  retentionDays: number;
  challenge: string;
};
