import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createApp } from "../../server/app";
const folder = mkdtempSync(path.join(tmpdir(), "tapago-workouts-"));
const url = `file:${folder}/test.db`,
  db = createDb(url),
  app = createApp(db);
const personal = request.agent(app),
  other = request.agent(app),
  student = request.agent(app),
  stranger = request.agent(app);
const header = { "X-Requested-With": "TaPago" };
let studentId: string, foreignStudentId: string, exercise: any, plan: any;
const exerciseData = {
  name: "Supino",
  muscleGroup: "Peitoral",
  category: "Musculação",
};
const planData = {
  title: "Adaptação",
  objective: "Força",
  difficulty: "Iniciante",
  startsAt: "2026-10-01",
  endsAt: "2026-11-01",
  workouts: [],
};
beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  for (const [agent, email, role] of [
    [personal, "wp@example.com", "personal"],
    [other, "wo@example.com", "personal"],
    [student, "ws@example.com", "student"],
    [stranger, "wx@example.com", "student"],
  ] as const) {
    expect(
      (
        await agent.post("/api/auth/register").set(header).send({
          name: "Teste",
          email,
          role,
          password: "senha-ficticia-12345",
        })
      ).status,
    ).toBe(201);
  }
  const data = {
    name: "Aluno Teste",
    mainGoal: "Força",
    startDate: "2026-01-01",
  };
  studentId = (await personal.post("/api/students").set(header).send(data)).body
    .id;
  foreignStudentId = (await other.post("/api/students").set(header).send(data))
    .body.id;
  const invite = await personal
    .post(`/api/students/${studentId}/invite`)
    .set(header);
  expect(
    (
      await student
        .post("/api/me/claim")
        .set(header)
        .send({ code: invite.body.code })
    ).status,
  ).toBe(200);
}, 60000);
afterAll(async () => {
  await db.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});
it("personal cria e edita exercício; biblioteca privada e URLs validadas", async () => {
  const created = await personal
    .post("/api/exercises")
    .set(header)
    .send(exerciseData);
  expect(created.status).toBe(201);
  exercise = created.body;
  const edited = await personal
    .put(`/api/exercises/${exercise.id}`)
    .set(header)
    .send({ ...exerciseData, name: "Supino reto" });
  expect(edited.status).toBe(200);
  exercise = edited.body;
  expect(
    (await personal.get("/api/exercises?q=reto&category=Musculação")).body,
  ).toHaveLength(1);
  expect((await other.get("/api/exercises")).body).toEqual([]);
  expect((await student.get("/api/exercises")).status).toBe(403);
  expect(
    (
      await other
        .put(`/api/exercises/${exercise.id}`)
        .set(header)
        .send(exerciseData)
    ).status,
  ).toBe(404);
  for (const bad of [
    { name: "  " },
    { videoUrl: "javascript:alert(1)" },
    { imageUrl: "file:///tmp/file" },
  ])
    expect(
      (
        await personal
          .post("/api/exercises")
          .set(header)
          .send({ ...exerciseData, ...bad })
      ).status,
    ).toBe(400);
});
it("cria plano para cadastro existente sem duplicar aluno e oculta rascunho", async () => {
  const count = await db.student.count();
  const result = await personal
    .post(`/api/students/${studentId}/workout-plans`)
    .set(header)
    .send(planData);
  expect(result.status).toBe(201);
  plan = result.body;
  expect(plan.studentId).toBe(studentId);
  expect(
    (await student.get(`/api/me/students/${studentId}/export`)).body.student
      .workoutPlans,
  ).toEqual([]);
  expect(
    (await personal.get(`/api/students/${studentId}/export`)).body.student
      .workoutPlans,
  ).toHaveLength(1);
  expect(await db.student.count()).toBe(count);
  expect((await student.get("/api/me/workout-plans")).body).toEqual([]);
  expect(
    (
      await personal
        .post(`/api/students/${foreignStudentId}/workout-plans`)
        .set(header)
        .send(planData)
    ).status,
  ).toBe(404);
  expect(
    (await other.get(`/api/students/${studentId}/workout-plans`)).status,
  ).toBe(404);
});
it("adiciona treinos e prescrições flexíveis, publica e persiste ordem", async () => {
  const second = (
    await personal
      .post("/api/exercises")
      .set(header)
      .send({ ...exerciseData, name: "Prancha" })
  ).body;
  const result = await personal
    .put(`/api/workout-plans/${plan.id}`)
    .set(header)
    .send({
      ...plan,
      status: "ativo",
      workouts: [
        {
          name: "Treino A",
          exercises: [
            {
              exerciseId: exercise.id,
              sets: 4,
              repetitions: "8-12",
              load: 60,
              restSeconds: 90,
              notes: "Controle o movimento",
            },
            { exerciseId: second.id, durationSeconds: 45 },
          ],
        },
        {
          name: "Treino B",
          exercises: [
            {
              exerciseId: second.id,
              durationSeconds: 1200,
              notes: "Intensidade moderada",
            },
          ],
        },
      ],
    });
  expect(result.status).toBe(200);
  plan = result.body;
  expect(plan.workouts[0].exercises[1].sets).toBeNull();
  const reorder = await personal
    .put(`/api/workout-plans/${plan.id}`)
    .set(header)
    .send({
      ...plan,
      workouts: [...plan.workouts]
        .reverse()
        .map((w) => ({ ...w, exercises: [...w.exercises].reverse() })),
    });
  expect(reorder.status).toBe(200);
  plan = reorder.body;
  expect(plan.workouts.map((w: any) => w.orderIndex)).toEqual([0, 1]);
  expect(plan.workouts[0].name).toBe("Treino B");
  expect(plan.workouts[1].exercises.map((e: any) => e.orderIndex)).toEqual([
    0, 1,
  ]);
  const read = (await student.get("/api/me/workout-plans")).body;
  expect(read).toHaveLength(1);
  expect(read[0].id).toBe(plan.id);
  expect(read[0].studentId).toBe(studentId);
  expect(read[0].workouts[1].exercises[1].load).toBe(60);
  expect(
    (await student.get(`/api/me/students/${studentId}/export`)).body.student
      .workoutPlans[0].id,
  ).toBe(plan.id);
});
it("nega edição e acesso cruzado, inclusive IDs de filhos e biblioteca alheia", async () => {
  expect((await stranger.get("/api/me/workout-plans")).body).toEqual([]);
  expect(
    (await other.put(`/api/workout-plans/${plan.id}`).set(header).send(plan))
      .status,
  ).toBe(404);
  expect(
    (await student.put(`/api/workout-plans/${plan.id}`).set(header).send(plan))
      .status,
  ).toBe(403);
  expect(
    (
      await student
        .post(`/api/students/${studentId}/workout-plans`)
        .set(header)
        .send(planData)
    ).status,
  ).toBe(403);
  const foreign = (
    await other.post("/api/exercises").set(header).send(exerciseData)
  ).body;
  for (const exercises of [
    [{ exerciseId: foreign.id }],
    [{ exerciseId: exercise.id, id: "unrelated" }],
  ]) {
    expect(
      (
        await personal
          .put(`/api/workout-plans/${plan.id}`)
          .set(header)
          .send({ ...plan, workouts: [{ ...plan.workouts[0], exercises }] })
      ).status,
    ).toBe(400);
  }
  expect(
    (
      await personal
        .put(`/api/workout-plans/${plan.id}`)
        .set(header)
        .send({
          ...plan,
          workouts: [{ name: "Outra", id: "unrelated", exercises: [] }],
          status: "arquivado",
        })
    ).status,
  ).toBe(400);
  expect(
    (await db.workoutPlan.findUniqueOrThrow({ where: { id: plan.id } }))
      .revision,
  ).toBe(plan.revision);
});
it("valida datas, números, nomes, ativação vazia e edição concorrente", async () => {
  for (const bad of [
    { title: " " },
    { startsAt: "2026-02-30" },
    { endsAt: "2025-01-01" },
    { status: "ativo" },
  ])
    expect(
      (
        await personal
          .post(`/api/students/${studentId}/workout-plans`)
          .set(header)
          .send({ ...planData, ...bad })
      ).status,
    ).toBe(400);
  for (const key of [
    "sets",
    "load",
    "durationSeconds",
    "restSeconds",
    "repetitions",
    "rir",
    "rpe",
  ])
    expect(
      (
        await personal
          .put(`/api/workout-plans/${plan.id}`)
          .set(header)
          .send({
            ...plan,
            workouts: [
              {
                name: "Treino",
                exercises: [
                  {
                    exerciseId: exercise.id,
                    [key]: key === "repetitions" ? "-1" : -1,
                  },
                ],
              },
            ],
          })
      ).status,
    ).toBe(400);
  expect(
    (
      await personal
        .put(`/api/workout-plans/${plan.id}`)
        .set(header)
        .send({ ...plan, revision: 1 })
    ).status,
  ).toBe(409);
  expect(
    (
      await personal
        .put(`/api/workout-plans/${plan.id}`)
        .set(header)
        .send({ ...plan, status: "rascunho" })
    ).status,
  ).toBe(400);
});
it("persiste linhas de séries e isola presets por personal", async () => {
  const series = [{ sets: 3, repetitions: "8-12", load: 15, restSeconds: 60 }, { sets: 1, repetitions: "15", load: 10, restSeconds: 90 }];
  const response = await personal.put(`/api/workout-plans/${plan.id}`).set(header).send({ ...plan,
    workouts: plan.workouts.map((w: any, i: number) => i ? w : { ...w, exercises: w.exercises.map((e: any) => ({ ...e, series })) }),
  });
  expect(response.status).toBe(200);
  plan = response.body;
  expect(plan.workouts[0].exercises[0].series).toEqual(series);
  expect((await student.get("/api/me/workout-plans")).body[0].workouts[0].exercises[0].series).toEqual(series);
  const bad = await personal.put(`/api/workout-plans/${plan.id}`).set(header).send({ ...plan,
    workouts: [{ ...plan.workouts[0], exercises: [{ ...plan.workouts[0].exercises[0], series: [{ ...series[0], load: -1 }] }] }],
  });
  expect(bad.status).toBe(400);
  const preset = await personal.post("/api/prescription-presets").set(header).send({ name: "Séries de teste", series });
  expect(preset.status).toBe(201);
  expect((await personal.get("/api/prescription-presets")).body[0].series).toEqual(series);
  expect((await other.get("/api/prescription-presets")).body).toEqual([]);
  expect((await student.get("/api/prescription-presets")).status).toBe(403);
  expect((await student.post("/api/prescription-presets").set(header).send({ name: "Teste", series })).status).toBe(403);
  expect((await personal.post("/api/prescription-presets").set(header).send({ name: "", series })).status).toBe(400);
});
it("feedback é exclusivo do aluno vinculado, persistente e idempotente", async () => {
  const endpoint = `/api/me/workouts/${plan.workouts[1].id}/feedbacks`;
  const payload = { requestId: "feedback-test-1", comment: "Consegui concluir, mas a última série foi difícil." };
  expect((await personal.post(endpoint).set(header).send(payload)).status).toBe(403);
  expect((await stranger.post(endpoint).set(header).send(payload)).status).toBe(404);
  expect((await student.post(endpoint).set(header).send({ ...payload, comment: " " })).status).toBe(400);
  expect((await student.post(endpoint).set(header).send({ ...payload, comment: "a".repeat(2001) })).status).toBe(400);
  const first = await student.post(endpoint).set(header).send(payload);
  expect(first.status).toBe(201);
  const repeated = await student.post(endpoint).set(header).send(payload);
  expect(repeated.body.id).toBe(first.body.id);
  expect(await db.workoutFeedback.count()).toBe(1);
  const read = await personal.get(`/api/students/${studentId}/workout-plans`);
  expect(read.body[0].workouts[1].feedbacks[0].comment).toBe(payload.comment);
  expect((await stranger.get("/api/me/workout-plans")).body).toEqual([]);
  await db.student.update({ where: { id: studentId }, data: { linkStatus: "ended" } });
  expect((await student.post(endpoint).set(header).send({ ...payload, requestId: "feedback-ended" })).status).toBe(404);
  await db.student.update({ where: { id: studentId }, data: { linkStatus: "active" } });
});
it("duplica treino, remove logicamente e arquiva sem quebrar relações", async () => {
  const w = plan.workouts[1];
  const copy = {
    ...w,
    id: undefined,
    exercises: w.exercises.map((e: any) => ({ ...e, id: undefined })),
  };
  let result = await personal
    .put(`/api/workout-plans/${plan.id}`)
    .set(header)
    .send({ ...plan, workouts: [...plan.workouts, copy] });
  expect(result.status).toBe(200);
  plan = result.body;
  expect(plan.workouts[2].id).not.toBe(w.id);
  expect(plan.workouts[2].exercises[0].id).not.toBe(w.exercises[0].id);
  const removed = plan.workouts[0].id,
    removedExercise = plan.workouts[1].exercises[0].id;
  result = await personal
    .put(`/api/workout-plans/${plan.id}`)
    .set(header)
    .send({
      ...plan,
      workouts: plan.workouts
        .slice(1)
        .map((w: any, i: number) =>
          i ? w : { ...w, exercises: w.exercises.slice(1) },
        ),
    });
  expect(result.status).toBe(200);
  plan = result.body;
  expect(
    (await db.workout.findUniqueOrThrow({ where: { id: removed } })).deletedAt,
  ).not.toBeNull();
  expect(
    (
      await db.workoutExercise.findUniqueOrThrow({
        where: { id: removedExercise },
      })
    ).deletedAt,
  ).not.toBeNull();
  expect(
    (
      await personal
        .put(`/api/exercises/${exercise.id}`)
        .set(header)
        .send({ ...exercise, status: "arquivado" })
    ).status,
  ).toBe(200);
  result = await personal
    .put(`/api/workout-plans/${plan.id}`)
    .set(header)
    .send({ ...plan, status: "arquivado" });
  expect(result.status).toBe(200);
  plan = result.body;
  expect((await student.post(`/api/me/workouts/${plan.workouts[0].id}/feedbacks`).set(header).send({ requestId: "archived-feedback", comment: "Teste" })).status).toBe(404);
  expect((await student.get("/api/me/workout-plans")).body[0].workouts[0].feedbacks).toHaveLength(1);
  expect((await student.get("/api/me/workout-plans")).body[0].status).toBe(
    "arquivado",
  );
  expect(
    await db.exercise.findUnique({ where: { id: exercise.id } }),
  ).not.toBeNull();
});
it("revogação remove acesso profissional, preserva leitura do aluno e exclusão explícita limpa dependentes", async () => {
  expect(
    (await student.post(`/api/me/students/${studentId}/revoke`).set(header))
      .status,
  ).toBe(200);
  expect(
    (await personal.get(`/api/students/${studentId}/workout-plans`)).status,
  ).toBe(404);
  expect(
    (await personal.put(`/api/workout-plans/${plan.id}`).set(header).send(plan))
      .status,
  ).toBe(404);
  expect((await student.get("/api/me/workout-plans")).body).toHaveLength(1);
  expect(
    (await student.delete(`/api/me/students/${studentId}`).set(header)).status,
  ).toBe(200);
  expect(await db.workoutPlan.count()).toBe(0);
  expect(await db.workout.count()).toBe(0);
  expect(await db.workoutExercise.count()).toBe(0);
  expect(await db.workoutFeedback.count()).toBe(0);
  expect(await db.exercise.count()).toBeGreaterThan(0);
});
