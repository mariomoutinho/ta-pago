import { describe, expect, it } from "vitest";
import { prescriptionSchema, seriesRowSchema } from "../../shared/workouts";
import { initialSeries, seriesFields, seriesTypes } from "../../shared/series";
import { defaultPrescriptionPresets } from "../../shared/default-presets";
import { prescriptionPresetSchema } from "../../shared/workouts";
describe("tipos de séries", () => {
  it("presets padrão são válidos e cada aplicação recebe uma cópia independente", () => {
    const presets = defaultPrescriptionPresets();
    expect(presets).toHaveLength(5);
    for (const preset of presets) expect(prescriptionPresetSchema.safeParse(preset).success).toBe(true);
    presets[0].series[0].sets = 10;
    expect(defaultPrescriptionPresets()[0].series[0].sets).toBe(1);
    expect(defaultPrescriptionPresets()[4].series[0]).toMatchObject({ sets: 3, repetitions: "8", restSeconds: 60 });
  });
  it("mantém o formato legado sem acrescentar campos vazios", () => {
    const row = { sets: 3, repetitions: "8-12", load: 20, restSeconds: 60 };
    expect(seriesRowSchema.parse(row)).toEqual(row);
    expect(seriesRowSchema.safeParse({ ...row, repetitions: "" }).success).toBe(false);
  });
  it("valida os sete tipos e preserva seus atributos", () => {
    for (const { value: type } of seriesTypes) {
      const row = { type, sets: 1, repetitions: type.startsWith("repetitions") ? "1" : "", load: null, restSeconds: null, ...Object.fromEntries(seriesFields(type).filter(f => f.key !== "combined").map(f => [f.key, f.numeric ? 20 : "Instrução"])) };
      expect(seriesRowSchema.parse(row)).toEqual(row);
    }
    expect(seriesRowSchema.safeParse({ type: "running", sets: 1, repetitions: "", distance: -1 }).success).toBe(false);
    expect(seriesRowSchema.safeParse({ type: "repetitions-time", sets: 1, repetitions: "1", durationSeconds: 1.5 }).success).toBe(false);
  });
  it("sugere tempo para alongamento e preserva séries já escolhidas", () => {
    const item = prescriptionSchema.parse({ exerciseId: "exercise", durationSeconds: 30 });
    expect(initialSeries(item)[0]).toMatchObject({ type: "repetitions-time", durationSeconds: 30 });
    const rows = [{ type: "notes" as const, sets: 1, repetitions: "", load: null, restSeconds: null, notes: "Respirar" }];
    expect(initialSeries({ ...item, series: rows })).toEqual(rows);
    expect(seriesFields("repetitions-time").map(f => f.key)).toEqual(["combined", "durationSeconds", "restSeconds"]);
  });
});
