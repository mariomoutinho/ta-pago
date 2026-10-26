import type { Prescription, SeriesRow } from "./workouts";
export type SeriesType = NonNullable<SeriesRow["type"]>;
export const seriesTypes: { value: SeriesType; label: string }[] = [
  { value: "repetitions-load", label: "Repetições e carga" },
  { value: "repetitions-load-time", label: "Repetições, carga e tempo" },
  { value: "repetitions-time", label: "Repetições e tempo" },
  { value: "time-incline", label: "Tempo e inclinação" },
  { value: "running", label: "Corrida" },
  { value: "notes", label: "Observações" },
  { value: "cadence", label: "Cadência" },
];
export type SeriesField = { key: "combined" | "load" | "durationSeconds" | "restSeconds" | "incline" | "distance" | "speed" | "notes" | "cadence"; label: string; numeric?: boolean };
export function seriesFields(type: SeriesType): SeriesField[] {
  const combined: SeriesField = { key: "combined", label: "Série/rep" };
  const time: SeriesField = { key: "durationSeconds", label: "Tempo (s)", numeric: true };
  const rest: SeriesField = { key: "restSeconds", label: "Intervalo (s)", numeric: true };
  const load: SeriesField = { key: "load", label: "Carga (kg)", numeric: true };
  if (type === "notes") return [{ key: "notes", label: "Observações" }];
  if (type === "cadence") return [{ key: "cadence", label: "Cadência" }];
  if (type === "time-incline") return [time, { key: "incline", label: "Inclinação (%)", numeric: true }, rest];
  if (type === "running") return [{ key: "distance", label: "Distância (km)", numeric: true }, time, { key: "speed", label: "Velocidade (km/h)", numeric: true }, rest];
  return [combined, ...(type !== "repetitions-time" ? [load] : []), ...(type !== "repetitions-load" ? [time] : []), rest];
}
export function initialSeries(item: Prescription): SeriesRow[] {
  if (item.series.length) return item.series.map(row => ({ ...row }));
  const stretching = /alongamento|mobilidade/i.test(item.exercise?.category ?? "");
  const type: SeriesType = stretching || item.durationSeconds !== null && item.load === null ? "repetitions-time" : "repetitions-load";
  return [{ type, sets: item.sets ?? 1, repetitions: item.repetitions || "1", load: item.load, restSeconds: item.restSeconds, ...(item.durationSeconds !== null ? { durationSeconds: item.durationSeconds } : {}) }];
}
export function seriesValue(row: SeriesRow, key: SeriesField["key"]): string {
  if (key === "combined") return `${row.sets}/${row.repetitions}`;
  return row[key] == null ? "" : String(row[key]);
}
