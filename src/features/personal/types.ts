import type { z } from "zod";
import type {
  studentSchema,
  programSchema,
  RecordKind,
} from "../../../shared/validation";
export type Program = z.infer<typeof programSchema> & { id: string; revision?: number; workouts?: import("../../../shared/workouts").WorkoutData[] };
export type Question = {
  id: string;
  position: number;
  dimension: string;
  text: string;
  type: "choice" | "text" | "number" | "scale";
  required: boolean;
  min: number | null;
  max: number | null;
  options: { id: string; label: string }[];
};
export type Template = {
  id: string;
  name: string;
  version: number;
  cycleDays: number;
  questions: Question[];
};
export type Evaluation = {
  id: string;
  templateId: string;
  template: Template;
  date: string;
  cycle: number;
  evaluator: string;
  programId: string | null;
  programSnapshot: string;
  status: "rascunho" | "concluida";
  notes: string;
  conclusion: string;
  actionPlan: string;
  answers: { questionId: string; value: string }[];
};
export type Criterion = {
  criterion: string;
  observation: string;
  initial: string;
  current: string;
  nextAction: string;
};
export type TrackingRecord = {
  id: string;
  date: string;
  kind: RecordKind;
  data: { [key: string]: string | number | null | Criterion[] };
};
export type Student = z.infer<typeof studentSchema> & {
  id: string;
  personalId: string;
  accountId: string | null;
  linkStatus: "unlinked" | "active" | "ended";
  personal?: { name: string };
  program: Program | null;
  evaluations: Evaluation[];
  records: TrackingRecord[];
  history: { id: string; action: string; createdAt: string; detail: unknown }[];
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "personal" | "student";
};
