import { it, expect } from "vitest";
import { combineExercises, exerciseBlocks, removeExercises, separateExercises, validExerciseGroups, canPersistExerciseOrder } from "../../shared/workout-groups";
import { planSchema, workoutTemplateSchema } from "../../shared/workouts";
const items = [1, 2, 3, 4].map(index => ({ id: String(index), clientId: String(index), exerciseId: "exercise", load: index * 10, notes: "nota " + index, series: [{ sets: 3, repetitions: "12", load: index * 10, restSeconds: 60 }], groupId: null as string | null }));
it("combina seleções não adjacentes na primeira posição selecionada, preservando valores e IDs", () => {
  const next = combineExercises(items, new Set(["1", "3"]), "circuito");
  expect(next.map(item => item.id)).toEqual(["1", "3", "2", "4"]);
  expect(next[0]).toEqual({ ...items[0], groupId: "circuito" });
  expect(next[1]).toEqual({ ...items[2], groupId: "circuito" });
  expect(exerciseBlocks(next).map(block => block.items.length)).toEqual([2, 1, 1]);
  expect(items.every(item => item.groupId === null)).toBe(true);
  expect(validExerciseGroups(next)).toBe(true);
});
it("combina e separa blocos inteiros sem duplicar prescrições", () => {
  const first = combineExercises(items, new Set(["1", "2"]), "par");
  const next = combineExercises(first, new Set(["group:par", "4"]), "trio");
  expect(next.map(item => item.id)).toEqual(["1", "2", "4", "3"]);
  expect(exerciseBlocks(next)[0].items).toHaveLength(3);
  expect(separateExercises(next, new Set(["group:trio"])).every(item => !item.groupId)).toBe(true);
  expect(next.slice(0, 3).every(item => item.groupId === "trio")).toBe(true);
  expect(combineExercises(items, new Set(["1"]), "sozinho")).toBe(items);
});
it("remove somente os itens marcados e dissolve blocos que ficam com um membro", () => {
  const combined = combineExercises(items, new Set(["1", "2"]), "par");
  const next = removeExercises(combined, new Set(["1", "4"]));
  expect(next.map(item => item.id)).toEqual(["2", "3"]);
  expect(next[0]).toEqual({ ...items[1], groupId: null });
  expect(validExerciseGroups(next)).toBe(true);
});
it("schemas rejeitam blocos unitários e intercalados", () => {
  for (const groupIds of [["a", null, null], ["a", "b", "a"]]) {
    const exercises = items.slice(0, 3).map((item, i) => ({ ...item, id: undefined, groupId: groupIds[i] }));
    expect(workoutTemplateSchema.safeParse({ name: "Modelo", exercises }).success).toBe(false);
    expect(planSchema.safeParse({ title: "Plano", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-24", workouts: [{ name: "A", exercises }] }).success).toBe(false);
  }
});
it("ordem isolada só é salva se os blocos e as associações já estiverem persistidos", () => {
  expect(canPersistExerciseOrder(items, [...items].reverse())).toBe(true);
  expect(canPersistExerciseOrder(items, combineExercises(items, new Set(["1", "2"]), "par"))).toBe(false);
  expect(canPersistExerciseOrder(items, items.slice(1))).toBe(false);
});

it("reordena membros sem alterar grupo, dados ou IDs", async () => {
  const { reorderGroupExercises } = await import("../../shared/workout-groups");
  const grouped = combineExercises(items, new Set(["1", "2", "3"]), "trio");
  const next = reorderGroupExercises(grouped, "trio", 2, 0);
  expect(next.map(item => item.id)).toEqual(["3", "1", "2", "4"]);
  expect(next[0]).toEqual({ ...items[2], groupId: "trio" });
  expect(validExerciseGroups(next)).toBe(true);
});
it("adiciona ocorrência existente ao grupo, retira e desfaz sem duplicações", async () => {
  const { insertExerciseInGroup, detachExercise, detachSelectedExercises } = await import("../../shared/workout-groups");
  const grouped = combineExercises(items, new Set(["1", "2"]), "par");
  const next = insertExerciseInGroup(grouped, items[3], "par");
  expect(next.map(item => item.id)).toEqual(["1", "2", "4", "3"]);
  expect(new Set(next.map(item => item.id)).size).toBe(4);
  const detached = detachExercise(next, "2");
  expect(detached.map(item => item.id)).toEqual(["1", "4", "2", "3"]);
  expect(detached[2].groupId).toBeNull(); expect(validExerciseGroups(detached)).toBe(true);
  expect(detachSelectedExercises(next, new Set(["1", "2", "4"])).map(item => item.id)).toEqual(["1", "2", "4", "3"]);
  expect(detachSelectedExercises(next, new Set(["1", "2", "4"])).every(item => item.groupId === null)).toBe(true);
  expect(insertExerciseInGroup(next, next[0], "par")).toBe(next);
});
it("combina seleções parciais de grupos sem fragmentar o restante", () => {
  const grouped = combineExercises(items, new Set(["1", "2", "3"]), "trio");
  const next = combineExercises(grouped, new Set(["2", "4"]), "novo");
  expect(validExerciseGroups(next)).toBe(true);
  expect(next.filter(item => item.groupId === "novo").map(item => item.id)).toEqual(["2", "4"]);
  expect(new Set(next.map(item => item.id)).size).toBe(4);
});
