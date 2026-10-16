import type { RecordKind } from "../../../shared/validation";
export const recordNames: Record<RecordKind, string> = {
  monthly: "Evolução mensal",
  physical: "Medidas físicas",
  training: "Treinamento",
  technical: "Avaliação técnica",
  social: "Adaptação social e comportamental",
  note: "Observação profissional",
};
export type Descriptor = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
};
export const recordFields: Record<RecordKind, Descriptor[]> = {
  monthly: [
    { key: "cycle", label: "Ciclo", type: "number", required: true, min: 1 },
    {
      key: "planned",
      label: "Treinos previstos",
      type: "number",
      required: true,
      min: 0,
    },
    {
      key: "completed",
      label: "Treinos realizados",
      type: "number",
      required: true,
      min: 0,
    },
    {
      key: "rpe",
      label: "RPE médio (0 a 10)",
      type: "number",
      min: 0,
      max: 10,
    },
    {
      key: "cardioMinutes",
      label: "Cardio (minutos)",
      type: "number",
      required: true,
      min: 0,
    },
    { key: "notes", label: "Observações e decisões", type: "textarea" },
  ],
  physical: [
    { key: "weight", label: "Peso (kg)", type: "number", min: 0.1 },
    {
      key: "waist",
      label: "Circunferência da cintura (cm)",
      type: "number",
      min: 0.1,
    },
    { key: "notes", label: "Contexto e observações", type: "textarea" },
  ],
  training: [
    { key: "title", label: "Nome da sessão", required: true },
    {
      key: "status",
      label: "Status",
      options: ["previsto", "realizado", "ausente"],
    },
    { key: "focus", label: "Ênfase / modalidade", required: true },
    { key: "duration", label: "Duração (minutos)", type: "number", min: 0 },
    { key: "rpe", label: "RPE (0 a 10)", type: "number", min: 0, max: 10 },
    { key: "exerciseName", label: "Exercício principal (nome padronizado)" },
    {
      key: "loadKg",
      label: "Carga no exercício principal (kg)",
      type: "number",
      min: 0,
    },
    {
      key: "repetitions",
      label: "Repetições no exercício principal",
      type: "number",
      min: 0,
    },
    {
      key: "distanceKm",
      label: "Distância do cardio (km)",
      type: "number",
      min: 0,
    },
    {
      key: "exercises",
      label: "Demais exercícios, séries e intensidade",
      type: "textarea",
    },
    {
      key: "notes",
      label: "Fadiga, dor, recuperação e observações",
      type: "textarea",
    },
  ],
  technical: [{ key: "notes", label: "Observações gerais", type: "textarea" }],
  social: [
    { key: "environment", label: "Adaptação ao ambiente" },
    { key: "confidence", label: "Confiança e autoestima" },
    { key: "autonomy", label: "Autonomia" },
    { key: "motivation", label: "Motivação e adesão" },
    { key: "sleep", label: "Sono e disposição" },
    {
      key: "notes",
      label: "Percepções, observações e próxima ação",
      type: "textarea",
      required: true,
    },
  ],
  note: [
    {
      key: "notes",
      label: "Observação profissional",
      type: "textarea",
      required: true,
    },
  ],
};
