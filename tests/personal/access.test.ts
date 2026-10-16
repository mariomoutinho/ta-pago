import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createApp } from "../../server/app";
import { seed } from "../../server/seed";
const folder = mkdtempSync(path.join(tmpdir(), "tapago-access-")),
  url = `file:${folder}/test.db`;
const db = createDb(url),
  app = createApp(db),
  personal = request.agent(app),
  other = request.agent(app),
  student = request.agent(app);
const header = { "X-Requested-With": "TaPago" },
  data = {
    name: "Aluno fictício",
    mainGoal: "Força",
    startDate: "2026-01-01",
    weeklyFrequency: 3,
  };
let id: string;
let template: any;
let evaluation: any;
beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  await seed(db);
  for (const [agent, email, role] of [
    [personal, "p@example.com", "personal"],
    [other, "o@example.com", "personal"],
    [student, "s@example.com", "student"],
  ] as const)
    expect(
      (
        await agent
          .post("/api/auth/register")
          .set(header)
          .send({
            name: "Conta teste",
            email,
            password: "senha-ficticia-12345",
            role,
          })
      ).status,
    ).toBe(201);
  id = (await personal.post("/api/students").set(header).send(data)).body.id;
  template = (await personal.get("/api/templates")).body[0];
  evaluation = (
    await personal
      .post(`/api/students/${id}/evaluations`)
      .set(header)
      .send({
        templateId: template.id,
        date: "2026-01-30",
        cycle: 1,
        evaluator: "Profissional",
        status: "rascunho",
        answers: [],
        conclusion: "Nota profissional",
      })
  ).body;
}, 60000);
afterAll(async () => {
  await db.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});
it("isola profissionais e restringe o papel aluno", async () => {
  expect((await other.get("/api/students")).body).toEqual([]);
  for (const suffix of ["", "/export"])
    expect((await other.get(`/api/students/${id}${suffix}`)).status).toBe(404);
  for (const suffix of ["/evaluations", "/records", "/invite", "/revoke"])
    expect(
      (await other.post(`/api/students/${id}${suffix}`).set(header).send({}))
        .status,
    ).toBe(404);
  expect(
    (await other.put(`/api/students/${id}`).set(header).send(data)).status,
  ).toBe(404);
  expect((await other.delete(`/api/students/${id}`).set(header)).status).toBe(
    404,
  );
  expect((await student.get("/api/students")).status).toBe(403);
});
it("aceita convite uma vez e protege campos profissionais", async () => {
  const invite = await personal.post(`/api/students/${id}/invite`).set(header);
  expect(invite.status).toBe(200);
  expect(
    (
      await student
        .post("/api/me/claim")
        .set(header)
        .send({ code: invite.body.code })
    ).status,
  ).toBe(200);
  expect(
    (
      await student
        .post("/api/me/claim")
        .set(header)
        .send({ code: invite.body.code })
    ).status,
  ).toBe(400);
  const result = await student
    .put(`/api/me/students/${id}/evaluations/${evaluation.id}`)
    .set(header)
    .send({
      answers: [{ questionId: template.questions[0].id, value: "Boa" }],
      status: "concluida",
      conclusion: "Alterada",
      date: "2030-01-01",
    });
  expect(result.status).toBe(200);
  expect(result.body.status).toBe("rascunho");
  expect(result.body.conclusion).toBe("Nota profissional");
  expect(result.body.date).toBe("2026-01-30");
  expect(
    (await personal.delete(`/api/students/${id}`).set(header)).status,
  ).toBe(409);
});
it("revoga o personal e preserva histórico para o aluno", async () => {
  expect(
    (await student.post(`/api/me/students/${id}/revoke`).set(header)).status,
  ).toBe(200);
  expect((await personal.get(`/api/students/${id}/export`)).status).toBe(404);
  expect((await student.get(`/api/me/students/${id}/export`)).status).toBe(200);
  expect(
    (
      await student
        .put(`/api/me/students/${id}/evaluations/${evaluation.id}`)
        .set(header)
        .send({ answers: [] })
    ).status,
  ).toBe(403);
  expect(await db.evaluation.count({ where: { studentId: id } })).toBe(1);
  expect(
    (await student.delete(`/api/me/students/${id}`).set(header)).status,
  ).toBe(200);
  expect(await db.evaluation.count({ where: { studentId: id } })).toBe(0);
});
it("invalida token nativo no logout", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .set({ ...header, "X-Client-Platform": "native" })
    .send({ email: "p@example.com", password: "senha-ficticia-12345" });
  expect(login.status).toBe(200);
  expect(login.body.token).toBeTruthy();
  const auth = { ...header, Authorization: `Bearer ${login.body.token}` };
  expect((await request(app).get("/api/students").set(auth)).status).toBe(200);
  expect((await request(app).post("/api/auth/logout").set(auth)).status).toBe(
    200,
  );
  expect((await request(app).get("/api/students").set(auth)).status).toBe(401);
});
