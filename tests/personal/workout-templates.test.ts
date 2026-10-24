import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createApp } from "../../server/app";
import { copyPreparedWorkout, type WorkoutTemplate } from "../../shared/workouts";

const folder = mkdtempSync(path.join(tmpdir(), "tapago-templates-"));
const url = `file:${folder}/test.db`;
const db = createDb(url);
const app = createApp(db);
const personal = request.agent(app), other = request.agent(app), student = request.agent(app);
const header = { "X-Requested-With": "TaPago" };
let exerciseId: string, foreignId: string, archivedId: string;
const series = [{ sets: 3, repetitions: "8-12", load: 20, restSeconds: 60 }];
const payload = () => ({ name: "Treino preparado A", subtitle: "Força", instructions: "Controle o movimento", exercises: [{ exerciseId, series, notes: "Sem pressa" }] });
beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe",
  });
  for (const [agent, email, role] of [[personal, "templates-owner@example.com", "personal"], [other, "templates-other@example.com", "personal"], [student, "templates-student@example.com", "student"]] as const) {
    expect((await agent.post("/api/auth/register").set(header).send({ name: "Teste", email, role, password: "senha-ficticia-12345" })).status).toBe(201);
  }
  const exercise = { name: "Supino", muscleGroup: "Peitoral", category: "Musculação" };
  exerciseId = (await personal.post("/api/exercises").set(header).send(exercise)).body.id;
  foreignId = (await other.post("/api/exercises").set(header).send(exercise)).body.id;
  archivedId = (await personal.post("/api/exercises").set(header).send({ ...exercise, status: "arquivado" })).body.id;
}, 60000);
afterAll(async () => { await db.$disconnect(); rmSync(folder, { recursive: true, force: true }); });

it("cria treino sem aluno e persiste exercícios, ordem e séries", async () => {
  expect(await db.student.count()).toBe(0);
  const created = await personal.post("/api/workout-templates").set(header).send({ ...payload(), exercises: [...payload().exercises, { exerciseId, durationSeconds: 30 }] });
  expect(created.status).toBe(201);
  const read = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.body.id);
  expect(read.exercises[0].series).toEqual(series);
  expect(read.exercises[1].durationSeconds).toBe(30);
  expect(read.exercises[0].exercise.name).toBe("Supino");
  expect(await db.student.count()).toBe(0);
  expect(await db.workoutPlan.count()).toBe(0);
  expect((await student.get("/api/me/workout-plans")).body).toEqual([]);
});
it("isola modelos por proprietário e nega acesso a alunos e anônimos", async () => {
  const created = (await personal.post("/api/workout-templates").set(header).send(payload())).body;
  expect((await other.get("/api/workout-templates")).body).toEqual([]);
  expect((await request(app).get("/api/workout-templates")).status).toBe(401);
  expect((await student.get("/api/workout-templates")).status).toBe(403);
  expect((await student.post("/api/workout-templates").set(header).send(payload())).status).toBe(403);
  expect((await student.put(`/api/workout-templates/${created.id}`).set(header).send(created)).status).toBe(403);
  expect((await student.delete(`/api/workout-templates/${created.id}`).set(header)).status).toBe(403);
  expect((await other.put(`/api/workout-templates/${created.id}`).set(header).send(created)).status).toBe(404);
  expect((await other.delete(`/api/workout-templates/${created.id}`).set(header)).status).toBe(404);
});
it("rejeita exercícios alheios, arquivados, ausentes e prescrições inválidas", async () => {
  for (const data of [
    { ...payload(), name: " " }, { ...payload(), exercises: [] },
    ...[foreignId, archivedId, "inexistente"].map(exerciseId => ({ ...payload(), exercises: [{ exerciseId }] })),
    { ...payload(), exercises: [{ exerciseId, load: -1 }] },
  ]) expect((await personal.post("/api/workout-templates").set(header).send(data)).status).toBe(400);
});
it("edita com revisão e impede sobrescrever uma versão mais nova", async () => {
  const template = (await personal.post("/api/workout-templates").set(header).send(payload())).body;
  const update = await personal.put(`/api/workout-templates/${template.id}`).set(header).send({ ...template, name: "Atualizado" });
  expect(update.status).toBe(200);
  expect(update.body.revision).toBe(2);
  expect((await personal.put(`/api/workout-templates/${template.id}`).set(header).send(template)).status).toBe(409);
  expect((await personal.put(`/api/workout-templates/${template.id}`).set(header).send({ ...update.body, exercises: [{ exerciseId: foreignId }] })).status).toBe(400);
});
it("copia para alunos com IDs novos e preserva cópias após edição ou exclusão do modelo", async () => {
  const created = (await personal.post("/api/workout-templates").set(header).send(payload())).body;
  const template: WorkoutTemplate = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.id);
  const first = copyPreparedWorkout(template), second = copyPreparedWorkout(template);
  first.exercises[0].series[0].load = 42;
  expect(template.exercises[0].series[0].load).toBe(20);
  expect(second.exercises[0].series[0].load).toBe(20);
  expect(first.id).toBeUndefined();
  const plans = [];
  for (const workout of [first, second]) {
    const target = (await personal.post("/api/students").set(header).send({ name: "Aluno de teste", mainGoal: "Força", startDate: "2026-10-23" })).body;
    const result = await personal.post(`/api/students/${target.id}/workout-plans`).set(header).send({
      title: "Rotina individual", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-23", workouts: [workout],
    });
    expect(result.status).toBe(201);
    plans.push(result.body);
  }
  expect(plans[0].workouts[0].id).not.toBe(plans[1].workouts[0].id);
  expect(plans[0].workouts[0].exercises[0].id).not.toBe(plans[1].workouts[0].exercises[0].id);
  expect((await personal.put(`/api/workout-templates/${created.id}`).set(header).send({ ...created, name: "Modelo alterado", exercises: [{ exerciseId, load: 100 }] })).status).toBe(200);
  expect((await personal.delete(`/api/workout-templates/${created.id}`).set(header)).status).toBe(200);
  const read = (await personal.get(`/api/students/${plans[0].studentId}/workout-plans`)).body[0];
  expect(read.workouts[0].name).toBe(template.name);
  expect(read.workouts[0].exercises[0].series[0].load).toBe(42);
  expect(read.status).toBe("rascunho");
  const published = await personal.put(`/api/workout-plans/${read.id}`).set(header).send({ ...read, status: "ativo" });
  expect(published.status).toBe(200);
  expect(published.body.publishedAt).not.toBeNull();
});
it("revalida disponibilidade ao salvar cópia de modelo desatualizado", async () => {
  const exercise = (await personal.post("/api/exercises").set(header).send({ name: "Remada", muscleGroup: "Dorsal", category: "Musculação" })).body;
  const created = (await personal.post("/api/workout-templates").set(header).send({ ...payload(), exercises: [{ exerciseId: exercise.id }] })).body;
  await personal.put(`/api/exercises/${exercise.id}`).set(header).send({ ...exercise, status: "arquivado" });
  const template: WorkoutTemplate = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.id);
  expect(template.exercises[0].exercise?.status).toBe("arquivado");
  const target = (await personal.post("/api/students").set(header).send({ name: "Aluno", mainGoal: "Força", startDate: "2026-10-23" })).body;
  expect((await personal.post(`/api/students/${target.id}/workout-plans`).set(header).send({ title: "Teste", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-23", workouts: [copyPreparedWorkout(template)] })).status).toBe(400);
});

it("reordena modelos com revisão, preserva prescrições e recusa IDs e proprietários inválidos", async () => {
  const data = { ...payload(), exercises: [1, 2, 3].map(load => ({ exerciseId, load, series, notes: "nota " + load })) };
  const created = (await personal.post("/api/workout-templates").set(header).send(data)).body;
  const ids = created.exercises.map((item: { clientId: string }) => item.clientId);
  const endpoint = "/api/workout-templates/" + created.id + "/order";
  expect((await other.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(404);
  expect((await student.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(403);
  for (const invalid of [[ids[0], ids[0], ids[2]], ["foreign", ids[1], ids[2]], ids.slice(1)])
    expect((await personal.put(endpoint).set(header).send({ revision: 1, ids: invalid })).status).toBe(409);
  const order = [ids[2], ids[0], ids[1]];
  expect((await personal.put(endpoint).set(header).send({ revision: 1, ids: order })).body.revision).toBe(2);
  expect((await personal.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(409);
  let read = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.id);
  expect(read.exercises.map((item: { load: number }) => item.load)).toEqual([3, 1, 2]);
  expect(read.exercises[0].series).toEqual(series);
  expect(read.exercises[0].notes).toBe("nota 3");
  expect((await personal.put(endpoint).set(header).send({ revision: 2, ids })).status).toBe(200);
  read = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.id);
  expect(read.exercises.map((item: { load: number }) => item.load)).toEqual([1, 2, 3]);
});
it("persiste alternativas privadas e presets completos sem duplicar o mesmo cadastro", async () => {
  const alt = (await personal.post("/api/exercises").set(header).send({ name: "Halteres", muscleGroup: "Peitoral", category: "Musculação" })).body;
  const result = await personal.post("/api/workout-templates").set(header).send({ ...payload(), exercises: [{ exerciseId, alternativeExerciseId: alt.id, notes: "Alternar se necessário" }] });
  expect(result.status).toBe(201);
  const read = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === result.body.id);
  expect(read.exercises).toHaveLength(1);
  expect(read.exercises[0].alternativeExercise.name).toBe("Halteres");
  for (const alternativeExerciseId of [foreignId, archivedId, exerciseId])
    expect((await personal.post("/api/workout-templates").set(header).send({ ...payload(), exercises: [{ exerciseId, alternativeExerciseId }] })).status).toBe(400);
  const preset = { name: "Completo", series, configuration: { sets: 3, repetitions: "12", load: 20, durationSeconds: 30, restSeconds: 60, rir: 2, rpe: 8, cadence: "3010", notes: "Controle" } };
  const first = await personal.post("/api/prescription-presets").set(header).send(preset);
  expect(first.status).toBe(201);
  expect((await personal.post("/api/prescription-presets").set(header).send(preset)).body.id).toBe(first.body.id);
  expect((await personal.get("/api/prescription-presets")).body[0].configuration).toEqual(preset.configuration);
  expect((await other.get("/api/prescription-presets")).body).toEqual([]);
});

it("persiste blocos combinados, impede fragmentar pela ordenação e preserva cópias independentes", async () => {
  const created = (await personal.post("/api/workout-templates").set(header).send({ ...payload(), exercises: [1, 2, 3].map(load => ({ exerciseId, load, groupId: load < 3 ? "dupla" : null, series, notes: "nota " + load })) })).body;
  expect(created.exercises).toHaveLength(3);
  const ids = created.exercises.map((item: { clientId: string }) => item.clientId);
  const endpoint = "/api/workout-templates/" + created.id + "/order";
  expect((await personal.put(endpoint).set(header).send({ revision: 1, ids: [ids[0], ids[2], ids[1]] })).status).toBe(400);
  expect((await personal.put(endpoint).set(header).send({ revision: 1, ids: [ids[2], ids[0], ids[1]] })).status).toBe(200);
  const read = (await personal.get("/api/workout-templates")).body.find((item: WorkoutTemplate) => item.id === created.id);
  expect(read.exercises.map((item: { load: number }) => item.load)).toEqual([3, 1, 2]);
  expect(read.exercises.slice(1).every((item: { groupId: string }) => item.groupId === "dupla")).toBe(true);
  const copy = copyPreparedWorkout(read);
  expect(copy.exercises[1].series).toEqual(series);
  expect(copy.exercises[1].groupId).toBe("dupla");
  const invalid = { ...read, exercises: [read.exercises[1]] };
  expect((await personal.put("/api/workout-templates/" + read.id).set(header).send(invalid)).status).toBe(400);
});
