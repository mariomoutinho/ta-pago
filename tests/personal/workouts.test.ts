import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createTestApp as createApp, provisionPersonal } from "./fixtures";
const folder = mkdtempSync(path.join(tmpdir(), "tapago-workouts-"));
process.env.PERSONAL_MEDIA_DIRECTORY = path.join(folder, "media");
process.env.PERSONAL_PUSH_DIRECTORY = path.join(folder, "push");
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
    process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  for (const [agent, email, role] of [
    [personal, "wp@example.com", "personal"],
    [other, "wo@example.com", "personal"],
    [student, "ws@example.com", "student"],
    [stranger, "wx@example.com", "student"],
  ] as const) {
    if (role === "personal") await provisionPersonal(db, { name: "Teste", email, password: "senha-ficticia-12345" });
    expect(
      (
        await agent.post(role === "personal" ? "/api/auth/login" : "/api/auth/register").set(header).send({
          name: "Teste",
          email,
          role,
          password: "senha-ficticia-12345",
        })
      ).status,
    ).toBe(role === "personal" ? 200 : 201);
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
it("upload MP4 é privado, valida arquivos e libera reprodução só em treino publicado", async () => {
  const file = readFileSync("tests/personal/fixtures/exercise.mp4");
  const upload = (agent: typeof personal, bytes = file, type = "video/mp4") => agent.put("/api/exercise-videos").set(header).set("Content-Type", type).send(bytes);
  expect((await upload(student)).status).toBe(403);
  expect((await upload(request.agent(app))).status).toBe(401);
  expect((await upload(personal, Buffer.from("<script>invalid</script>"))).status).toBe(415);
  expect((await upload(personal, file, "text/html")).status).toBe(415);
  const saved = await upload(personal);
  expect(saved.status).toBe(201);
  const videoUrl = saved.body.url, videoPath = new URL(videoUrl).pathname;
  const created = await personal.post("/api/exercises").set(header).send({ ...exerciseData, name: "Vídeo sintético", videoUrl });
  expect(created.status).toBe(201);
  expect((await other.post("/api/exercises").set(header).send({ ...exerciseData, videoUrl })).status).toBe(400);
  expect((await personal.get(videoPath)).headers["content-type"]).toContain("video/mp4");
  const range = await personal.get(videoPath).set("Range", "bytes=0-15");
  expect(range.status).toBe(206);
  expect(range.headers["content-length"]).toBe("16");
  expect((await other.get(videoPath)).status).toBe(404);
  expect((await student.get(videoPath)).status).toBe(404);
  expect((await request(app).get(videoPath)).status).toBe(401);
  const draft = await personal.post(`/api/students/${studentId}/workout-plans`).set(header).send({ ...planData, workouts: [{ name: "Vídeo", exercises: [{ exerciseId: created.body.id }] }] });
  expect(draft.status).toBe(201);
  expect((await student.get(videoPath)).status).toBe(404);
  const published = await personal.put(`/api/workout-plans/${draft.body.id}`).set(header).send({ ...draft.body, status: "ativo" });
  expect(published.status).toBe(200);
  expect((await student.get(videoPath).set("Range", "bytes=-16")).status).toBe(206);
  expect((await stranger.get(videoPath)).status).toBe(404);
  await db.workoutPlan.delete({ where: { id: draft.body.id } });
});
it("favoritos persistem por personal, validam booleano e sobrevivem à edição", async () => {
  const created = await personal.post("/api/exercises").set(header).send({ ...exerciseData, name: "Favorito sintético" });
  const id = created.body.id;
  expect(created.body.favorite).toBe(false);
  for (let i = 0; i < 2; i++) {
    const saved = await personal.put(`/api/exercises/${id}/favorite`).set(header).send({ favorite: true });
    expect(saved.status).toBe(200);
    expect(saved.body.favorite).toBe(true);
  }
  expect((await other.put(`/api/exercises/${id}/favorite`).set(header).send({ favorite: false })).status).toBe(404);
  expect((await student.put(`/api/exercises/${id}/favorite`).set(header).send({ favorite: true })).status).toBe(403);
  for (const body of [{}, { favorite: "false" }, { favorite: null }]) {
    expect((await personal.put(`/api/exercises/${id}/favorite`).set(header).send(body)).status).toBe(400);
  }
  await personal.put(`/api/exercises/${id}`).set(header).send({ ...exerciseData, name: "Favorito editado", status: "arquivado" });
  expect((await personal.get("/api/exercises?favorite=true")).body.map((e: any) => e.id)).toContain(id);
  expect((await other.get("/api/exercises?favorite=true")).body).toEqual([]);
  await personal.put(`/api/exercises/${id}/favorite`).set(header).send({ favorite: false });
  expect((await personal.get("/api/exercises?favorite=true")).body).toEqual([]);
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
it("conclusão diária é exclusiva do aluno, persiste e gera novidade só para seu personal", async () => {
  const id=plan.workouts[0].id,endpoint=`/api/me/workouts/${id}/completion`;
  expect((await personal.post(endpoint).set(header).send({})).status).toBe(403);
  expect((await stranger.post(endpoint).set(header).send({})).status).toBe(404);
  const first=await student.post(endpoint).set(header).send({});expect(first.status).toBe(201);
  expect((await student.post(endpoint).set(header).send({})).body.id).toBe(first.body.id);
  expect(await db.workoutCompletion.count({where:{workoutId:id}})).toBe(1);
  const read=(await student.get('/api/me/workout-plans')).body.find((p:any)=>p.id===plan.id);
  expect(read.workouts[0].completions[0].id).toBe(first.body.id);
  const news=(await personal.get('/api/notifications/feed')).body;
  expect(news.some((item:any)=>item.kind==='workout_completed'&&item.id===`completion:${first.body.id}`)).toBe(true);
  expect((await other.get('/api/notifications/feed')).body).toEqual([]);
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

it("reordena somente associações autorizadas, preserva IDs e publica a ordem para o aluno", async () => {
  const owner = request.agent(app), viewer = request.agent(app);
  await provisionPersonal(db, { name: "Ordem", email: "order-owner@example.com", password: "senha-ficticia-12345" });
  await owner.post("/api/auth/login").set(header).send({ email: "order-owner@example.com", password: "senha-ficticia-12345" });
  await viewer.post("/api/auth/register").set(header).send({ name: "Aluno", email: "order-viewer@example.com", role: "student", password: "senha-ficticia-12345" });
  const target = (await owner.post("/api/students").set(header).send({ name: "Aluno", mainGoal: "Força", startDate: "2026-10-23" })).body;
  const invite = (await owner.post("/api/students/" + target.id + "/invite").set(header)).body;
  await viewer.post("/api/me/claim").set(header).send({ code: invite.code });
  const ex = (await owner.post("/api/exercises").set(header).send(exerciseData)).body;
  const alt = (await owner.post("/api/exercises").set(header).send({ ...exerciseData, name: "Alternativa" })).body;
  const result = await owner.post("/api/students/" + target.id + "/workout-plans").set(header).send({ ...planData, status: "ativo", workouts: [{ name: "A", exercises: [1, 2, 3].map(load => ({ exerciseId: ex.id, load, alternativeExerciseId: alt.id, notes: "Manter " + load })) }] });
  expect(result.status).toBe(201);
  const created = result.body, workout = created.workouts[0], ids = workout.exercises.map((item: { id: string }) => item.id);
  const endpoint = "/api/workout-plans/" + created.id + "/workouts/" + workout.id + "/order";
  expect((await other.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(404);
  expect((await viewer.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(403);
  expect((await owner.put(endpoint).set(header).send({ revision: 1, ids: [ids[0], ids[0], ids[2]] })).status).toBe(409);
  expect((await owner.put(endpoint).set(header).send({ revision: 1, ids: [ids[2], ids[0], ids[1]] })).status).toBe(200);
  const read = (await viewer.get("/api/me/workout-plans")).body[0].workouts[0].exercises;
  expect(read.map((item: { id: string }) => item.id)).toEqual([ids[2], ids[0], ids[1]]);
  expect(read[0].load).toBe(3); expect(read[0].notes).toBe("Manter 3");
  expect(read[0].alternativeExercise.name).toBe("Alternativa");
  expect((await owner.put(endpoint).set(header).send({ revision: 1, ids })).status).toBe(409);
  expect(await db.exercise.count({ where: { id: ex.id } })).toBe(1);
});

it("combina e exclui em lote apenas associações do próprio plano, mantendo biblioteca e outro aluno", async () => {
  const owner = request.agent(app), viewer = request.agent(app);
  await provisionPersonal(db, { name: "Blocos", email: "groups-owner@example.com", password: "senha-ficticia-12345" });
  await owner.post("/api/auth/login").set(header).send({ email: "groups-owner@example.com", password: "senha-ficticia-12345" });
  await viewer.post("/api/auth/register").set(header).send({ name: "Aluno", email: "groups-viewer@example.com", role: "student", password: "senha-ficticia-12345" });
  const ex = (await owner.post("/api/exercises").set(header).send(exerciseData)).body;
  const targets = [];
  for (let index = 0; index < 2; index++) targets.push((await owner.post("/api/students").set(header).send({ name: "Aluno " + index, mainGoal: "Força", startDate: "2026-10-24" })).body);
  const invite = (await owner.post("/api/students/" + targets[0].id + "/invite").set(header)).body;
  await viewer.post("/api/me/claim").set(header).send({ code: invite.code });
  const plans = [];
  for (const target of targets) plans.push((await owner.post("/api/students/" + target.id + "/workout-plans").set(header).send({ ...planData, status: "ativo", workouts: [{ name: "A", exercises: [1, 2, 3].map(load => ({ exerciseId: ex.id, load, notes: "Manter " + load })) }] })).body);
  const original = plans[0], w = original.workouts[0];
  const combined = { ...original, workouts: [{ ...w, exercises: w.exercises.map((item: { load: number }) => ({ ...item, groupId: item.load < 3 ? "dupla" : null })) }] };
  expect((await other.put("/api/workout-plans/" + original.id).set(header).send(combined)).status).toBe(404);
  expect((await viewer.put("/api/workout-plans/" + original.id).set(header).send(combined)).status).toBe(403);
  const saved = await owner.put("/api/workout-plans/" + original.id).set(header).send(combined);
  expect(saved.status).toBe(200);
  expect(saved.body.workouts[0].exercises.map((item: { id: string }) => item.id)).toEqual(w.exercises.map((item: { id: string }) => item.id));
  const endpoint = "/api/workout-plans/" + original.id + "/workouts/" + w.id + "/order";
  expect((await owner.put(endpoint).set(header).send({ revision: saved.body.revision, ids: [w.exercises[0].id, w.exercises[2].id, w.exercises[1].id] })).status).toBe(400);
  expect((await viewer.get("/api/me/workout-plans")).body[0].workouts[0].exercises[0].groupId).toBe("dupla");
  const ungrouped = await owner.put("/api/workout-plans/" + original.id).set(header).send({ ...saved.body, workouts: [{ ...saved.body.workouts[0], exercises: saved.body.workouts[0].exercises.map(({ groupId: _groupId, ...item }: { groupId: string }) => item) }] });
  expect(ungrouped.status).toBe(200);
  expect(ungrouped.body.workouts[0].exercises.every((item: { groupId: string | null }) => item.groupId === null)).toBe(true);
  saved.body = ungrouped.body;
  const deleted = await owner.put("/api/workout-plans/" + original.id).set(header).send({ ...saved.body, workouts: [{ ...saved.body.workouts[0], exercises: [saved.body.workouts[0].exercises[2]] }] });
  expect(deleted.status).toBe(200);
  expect(deleted.body.workouts[0].exercises[0].load).toBe(3);
  expect(await db.workoutExercise.count({ where: { workoutId: w.id, deletedAt: { not: null } } })).toBe(2);
  expect(await db.exercise.count({ where: { id: ex.id } })).toBe(1);
  const untouched = (await owner.get("/api/students/" + targets[1].id + "/workout-plans")).body[0];
  expect(untouched.revision).toBe(1); expect(untouched.workouts[0].exercises).toHaveLength(3);
});

it("aluno salva cargas isoladas, preserva prescrição e respeita vínculo e revisão", async () => {
 const owner=request.agent(app), viewer=request.agent(app), outsider=request.agent(app);
 await provisionPersonal(db,{name:'Personal Cargas',email:'loads-owner@example.test',password:'abcdef'});
 await owner.post('/api/auth/login').set(header).send({email:'loads-owner@example.test',password:'abcdef'});
 for(const [agent,email] of [[viewer,'loads-viewer@example.test'],[outsider,'loads-outsider@example.test']] as const)await agent.post('/api/auth/register').set(header).send({name:'Aluno Cargas',email,password:'abcdef',role:'student'});
 const target=(await owner.post('/api/students').set(header).send({name:'Aluno Cargas',mainGoal:'Força',startDate:'2026-11-02'})).body;
 const invite=(await owner.post('/api/students/'+target.id+'/invite').set(header)).body;
 await viewer.post('/api/me/claim').set(header).send({code:invite.code});
 const ex=(await owner.post('/api/exercises').set(header).send(exerciseData)).body;
 const created=(await owner.post('/api/students/'+target.id+'/workout-plans').set(header).send({...planData,status:'ativo',workouts:[{name:'A',exercises:[{exerciseId:ex.id,load:20,series:[{sets:3,repetitions:'10',load:20,restSeconds:60},{sets:2,repetitions:'8',load:25,restSeconds:60}]}]}]})).body;
 const item=created.workouts[0].exercises[0], endpoint='/api/me/workout-exercises/'+item.id+'/loads';
 for(const agent of [owner,outsider])expect((await agent.put(endpoint).set(header).send({revision:1,loads:[12.5,0]})).status).toBeGreaterThanOrEqual(400);
 for(const loads of [[-1,null],[1],[1000001,0],['20',0]])expect((await viewer.put(endpoint).set(header).send({revision:1,loads})).status).toBe(400);
 expect((await viewer.put(endpoint).set(header).send({revision:1,loads:[12.5,0],repetitions:'999'})).status).toBe(400);
 expect((await viewer.put(endpoint).set(header).send({revision:99,loads:[12.5,0]})).status).toBe(409);
 expect((await viewer.put(endpoint).set(header).send({revision:1,loads:[12.5,0]})).status).toBe(200);
 let read=(await viewer.get('/api/me/workout-plans')).body.find((p:any)=>p.id===created.id).workouts[0].exercises[0];
 expect(read.studentLoads.loads).toEqual([12.5,0]);expect(read.series).toEqual(item.series);expect(read.load).toBe(20);
 const progressEndpoint='/api/me/workout-exercises/'+item.id+'/progress';
 expect((await outsider.put(progressEndpoint).set(header).send({revision:1,version:0,completedSets:[1,0]})).status).toBe(404);
 expect((await owner.put(progressEndpoint).set(header).send({revision:1,version:0,completedSets:[1,0]})).status).toBe(403);
 expect((await viewer.put(progressEndpoint).set(header).send({revision:1,version:0,completedSets:[4,0]})).status).toBe(400);
 expect((await viewer.put(progressEndpoint).set(header).send({revision:1,version:0,completedSets:[1,0]})).status).toBe(200);
 expect((await viewer.put(progressEndpoint).set(header).send({revision:1,version:0,completedSets:[1,0]})).status).toBe(409);
 const group=(await owner.post('/api/fitness-groups').set(header).send({name:'Grupo de testes'})).body;
 const inviteCode=group.inviteUrl.split('/').pop();
 expect((await viewer.get('/api/fitness-groups/'+group.id)).status).toBe(404);
 expect((await outsider.post('/api/fitness-groups/invite/'+inviteCode).set(header).send({})).status).toBe(403);
 expect((await viewer.post('/api/fitness-groups/invite/'+inviteCode).set(header).send({})).status).toBe(200);
 expect((await viewer.post('/api/fitness-groups/invite/'+inviteCode).set(header).send({})).status).toBe(200);
 expect((await owner.post('/api/fitness-groups/'+group.id+'/challenges').set(header).send({title:'Constância',startsAt:'2026-01-01',endsAt:'2026-12-31',goal:1})).status).toBe(201);
 expect((await outsider.get('/api/fitness-groups/'+group.id)).status).toBe(404);
 await viewer.post('/api/me/workouts/'+created.workouts[0].id+'/completion').set(header).send({});
 await viewer.post('/api/me/workouts/'+created.workouts[0].id+'/completion').set(header).send({});
 expect((await viewer.post('/api/me/workouts/'+created.workouts[0].id+'/feedbacks').set(header).send({requestId:'group-test-12345',comment:'Concluído',groupId:group.id})).status).toBe(201);
 const groupRead=(await owner.get('/api/fitness-groups/'+group.id)).body;
 expect(groupRead.members).toBe(1);expect(groupRead.posts).toHaveLength(1);expect(groupRead.challenges[0].ranking[0].count).toBe(1);
 expect((await viewer.post('/api/fitness-groups/'+group.id+'/leave').set(header).send({})).status).toBe(200);
 expect((await owner.get('/api/fitness-groups/'+group.id)).body.posts).toHaveLength(0);
 expect((await viewer.get('/api/fitness-groups/'+group.id)).status).toBe(404);
 expect((await viewer.post('/api/me/workouts/'+created.workouts[0].id+'/feedbacks').set(header).send({requestId:'group-test-left',comment:'Não compartilhar',groupId:group.id})).status).toBe(403);

 expect((await viewer.put(endpoint).set(header).send({revision:1,loads:[null,0]})).status).toBe(200);
 const changed=await owner.put('/api/workout-plans/'+created.id).set(header).send({...created,workouts:[{...created.workouts[0],exercises:[{...item,series:[{...item.series[0],load:30},item.series[1]]}]}]});
 expect(changed.status).toBe(200);
 read=(await viewer.get('/api/me/workout-plans')).body.find((p:any)=>p.id===created.id).workouts[0].exercises[0];expect(read.studentLoads).toBeNull();
 expect((await viewer.put(endpoint).set(header).send({revision:1,loads:[12,0]})).status).toBe(409);
 await owner.put('/api/workout-plans/'+created.id).set(header).send({...changed.body,status:'arquivado'});
 expect((await viewer.put(endpoint).set(header).send({revision:3,loads:[12,0]})).status).toBe(404);
});
