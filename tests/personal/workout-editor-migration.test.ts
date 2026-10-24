import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const SQLite = createRequire(import.meta.url)("better-sqlite3");
it("migração preserva entradas e ordem de modelos já preenchidos e atribui IDs estáveis", () => {
  const db = new SQLite(":memory:");
  try {
    db.exec('CREATE TABLE Exercise(id TEXT PRIMARY KEY); CREATE TABLE WorkoutExercise(id TEXT); CREATE TABLE PrescriptionPreset(series JSONB); CREATE TABLE WorkoutTemplate(id TEXT, exercises JSONB);');
    const items = [{ exerciseId: "a", sets: 3, notes: "Manter", series: [{ sets: 2, repetitions: "12", load: 20, restSeconds: 60 }] }, { exerciseId: "b", durationSeconds: 30 }];
    db.prepare("INSERT INTO WorkoutTemplate VALUES (?, ?)").run("modelo", JSON.stringify(items));
    db.exec(readFileSync("prisma/migrations/20261023180000_workout_editor/migration.sql", "utf8"));
    const saved = JSON.parse(db.prepare("SELECT exercises FROM WorkoutTemplate").get().exercises);
    expect(saved.map(({ clientId, ...item }: { clientId: string }) => item)).toEqual(items);
    expect(new Set(saved.map((item: { clientId: string }) => item.clientId)).size).toBe(2);
    expect(saved.every((item: { clientId: string }) => typeof item.clientId === "string" && item.clientId.length > 0)).toBe(true);
    expect(JSON.parse(db.prepare("SELECT exercises FROM WorkoutTemplate").get().exercises)).toEqual(saved);
  } finally { db.close(); }
});

it("migração de blocos mantém prescrições existentes sem combinar automaticamente", () => {
  const db = new SQLite(":memory:");
  try {
    db.exec('CREATE TABLE WorkoutExercise(id TEXT, workoutId TEXT, orderIndex INTEGER, notes TEXT);');
    db.prepare("INSERT INTO WorkoutExercise VALUES (?, ?, ?, ?)").run("prescricao", "treino", 3, "Manter observações");
    db.exec(readFileSync("prisma/migrations/20261024120000_workout_groups/migration.sql", "utf8"));
    expect(db.prepare("SELECT * FROM WorkoutExercise").get()).toEqual({ id: "prescricao", workoutId: "treino", orderIndex: 3, notes: "Manter observações", groupId: null });
  } finally { db.close(); }
});
