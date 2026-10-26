import type { PrescriptionPreset, SeriesRow } from "./workouts";

/** Modelos editáveis do aplicativo; não são presets privados de uma conta. */
export function defaultPrescriptionPresets(): PrescriptionPreset[] {
  const entries: { id: string; name: string; row: SeriesRow }[] = [
    { id: "mobility-1-8", name: "1/8 mobilidade", row: { type: "repetitions-time", sets: 1, repetitions: "8", load: null, durationSeconds: null, restSeconds: null } },
    { id: "2-15", name: "2x15", row: { type: "repetitions-load", sets: 2, repetitions: "15", load: null, restSeconds: null } },
    { id: "3-8", name: "3/8", row: { type: "repetitions-load", sets: 3, repetitions: "8", load: null, restSeconds: null } },
    { id: "3-8-12", name: "3x8-12", row: { type: "repetitions-load", sets: 3, repetitions: "8-12", load: null, restSeconds: null } },
    { id: "3-8-rest-60", name: "3x8-60", row: { type: "repetitions-load", sets: 3, repetitions: "8", load: null, restSeconds: 60 } },
  ];
  return entries.map(({ id, name, row }) => ({ id: `default-${id}`, name, series: [row], configuration: null }));
}
