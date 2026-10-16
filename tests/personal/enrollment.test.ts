import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createApp } from "../../server/app";
import { purgeEnrollments } from "../../server/enrollment";
import { policyVersion } from "../../shared/enrollment";
import { sessionKey } from "../../server/security";
const folder = mkdtempSync(path.join(tmpdir(), "tapago-enrollment-")),
  url = `file:${folder}/test.db`,
  db = createDb(url);
let app: ReturnType<typeof createApp>,
  owner: ReturnType<typeof request.agent>,
  other: ReturnType<typeof request.agent>,
  student: ReturnType<typeof request.agent>,
  token: string,
  requestId: string;
const headers = { "X-Requested-With": "TaPago" };
const form = {
  name: "Aluno Cadastro",
  email: "existing@example.com",
  phone: "11912345678",
  birthDate: "1998-04-10",
  city: "São Paulo",
  state: "SP",
  gender: "Não informar",
  goals: ["Hipertrofia"],
  specificGoals: "Ganhar força",
  practicing: "Sim",
  daysPerWeek: 3,
  experienceDuration: "Um ano",
  previousTrainer: "Não",
  preferredActivity: "Musculação",
  availability: "Segunda, quarta e sexta",
  health: {
    restrictions: "Recomendação privada",
    injuries: "",
    adaptations: "",
  },
  consent: true,
  healthConsent: true,
  policyVersion,
};
beforeAll(async () => {
  process.env.PERSONAL_ENROLLMENT_KEY = "ab".repeat(32);
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  app = createApp(db);
  owner = request.agent(app);
  other = request.agent(app);
  student = request.agent(app);
  for (const [agent, email, role] of [
    [owner, "owner@example.com", "personal"],
    [other, "other@example.com", "personal"],
    [student, form.email, "student"],
  ] as const)
    expect(
      (
        await agent
          .post("/api/auth/register")
          .set(headers)
          .send({
            name: "Pessoa Teste",
            email,
            role,
            password: "senha-de-teste-12345",
          })
      ).status,
    ).toBe(201);
}, 60000);
beforeEach(() => {
  app = createApp(db);
});
afterAll(async () => {
  await db.$disconnect();
  delete process.env.PERSONAL_ENROLLMENT_KEY;
  rmSync(folder, { recursive: true, force: true });
});
async function proof(t = token) {
  const response = await request(app).get(`/api/public/enrollment/${t}`);
  expect(response.status).toBe(200);
  await db.enrollmentChallenge.update({
    where: { id: sessionKey(response.body.challenge) },
    data: { createdAt: new Date(Date.now() - 3000) },
  });
  return response.body.challenge;
}
async function submit(data: unknown = form) {
  return request(app)
    .post(`/api/public/enrollment/${token}`)
    .set(headers)
    .send({ ...(data as object), challenge: await proof() });
}
it("somente personal autenticado gera o link e nome público correto", async () => {
  expect(
    (await request(app).post("/api/enrollment/link").set(headers).send({}))
      .status,
  ).toBe(401);
  expect(
    (await student.post("/api/enrollment/link").set(headers).send({})).status,
  ).toBe(403);
  expect(
    (
      await owner
        .post("/api/enrollment/link")
        .set(headers)
        .send({
          publicName: "Personal Público",
          contact: "contato@example.com",
        })
    ).status,
  ).toBe(201);
  const result = await owner.get("/api/enrollment/link");
  expect(result.body.url).toMatch(
    /^http:\/\/localhost:3003\/cadastro\/[a-f0-9]{64}$/,
  );
  token = result.body.token;
  const page = await request(app).get(`/api/public/enrollment/${token}`);
  expect(page.body.personalName).toBe("Personal Público");
  expect(Object.keys(page.body).sort()).toEqual([
    "challenge",
    "contact",
    "personalName",
    "policyVersion",
    "retentionDays",
  ]);
});
it("recusa link inválido, formulário incompleto, origem externa e saúde sem autorização", async () => {
  expect(
    (await request(app).get("/api/public/enrollment/invalido")).status,
  ).toBe(404);
  expect((await submit({ name: "Nome" })).status).toBe(400);
  expect((await submit({ ...form, healthConsent: false })).status).toBe(400);
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .set("Origin", "https://evil.example")
        .send(form)
    ).status,
  ).toBe(403);
});
it("persiste ficha criptografada como pendente sem criar conta ou aluno", async () => {
  const users = await db.user.count();
  const result = await submit();
  expect(result.status).toBe(202);
  expect(result.text).not.toContain(form.email);
  expect(result.text).not.toContain(form.health.restrictions);
  expect(await db.user.count()).toBe(users);
  expect(await db.student.count()).toBe(0);
  const row = await db.enrollmentRequest.findFirstOrThrow();
  requestId = row.id;
  expect(row.status).toBe("pending");
  expect(row.payload).not.toContain(form.email);
  expect(row.healthPayload).not.toContain(form.health.restrictions);
  expect(row.healthConsentAt).toBeTruthy();
  expect(row.policyVersion).toBe(policyVersion);
  const list = await owner.get("/api/enrollment/requests");
  expect(list.body).toHaveLength(1);
  expect(list.body[0].name).toBe(form.name);
  expect(list.text).not.toContain(form.health.restrictions);
});
it("isola ficha e decisões por profissional", async () => {
  expect((await other.get("/api/enrollment/requests")).body).toEqual([]);
  for (const route of [`/api/enrollment/requests/${requestId}`]) {
    expect((await other.get(route)).status).toBe(404);
    expect((await request(app).get(route)).status).toBe(401);
    expect(
      (
        await other
          .post(route + "/status")
          .set(headers)
          .send({ status: "active" })
      ).status,
    ).toBe(404);
  }
  const detail = await owner.get(`/api/enrollment/requests/${requestId}`);
  expect(detail.body.form.health.restrictions).toBe(form.health.restrictions);
});
it("envio repetido retorna resposta genérica sem duplicar", async () => {
  expect(
    (await submit({ ...form, email: "EXISTING@example.com" })).status,
  ).toBe(202);
  expect(await db.enrollmentRequest.count()).toBe(1);
});
it("aprova uma vez e preserva a conta existente", async () => {
  for (let i = 0; i < 2; i++)
    expect(
      (
        await owner
          .post(`/api/enrollment/requests/${requestId}/status`)
          .set(headers)
          .send({ status: "active" })
      ).status,
    ).toBe(200);
  expect(await db.student.count()).toBe(1);
  expect(await db.user.count()).toBe(3);
  const row = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  expect(row.status).toBe("active");
  const s = await db.student.findUniqueOrThrow({
    where: { id: row.studentId! },
  });
  expect(s.accountId).toBeNull();
  expect(s.injuries).toBe("");
  expect((await owner.get("/api/students")).body[0].id).toBe(s.id);
  const invitation = await owner
    .post(`/api/students/${s.id}/invite`)
    .set(headers);
  expect(
    (
      await student
        .post("/api/me/claim")
        .set(headers)
        .send({ code: invitation.body.code })
    ).status,
  ).toBe(200);
});
it("desativa vínculo preservando o acesso do aluno e histórico", async () => {
  expect(
    (
      await owner
        .post(`/api/enrollment/requests/${requestId}/status`)
        .set(headers)
        .send({ status: "inactive" })
    ).status,
  ).toBe(200);
  const row = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  expect((await owner.get(`/api/students/${row.studentId}`)).status).toBe(404);
  expect((await student.get(`/api/me/students/${row.studentId}`)).status).toBe(
    200,
  );
  expect(await db.enrollmentEvent.count({ where: { requestId } })).toBe(3);
});
it("recusa e exclui uma solicitação sem afetar outras", async () => {
  expect((await submit({ ...form, email: "second@example.com" })).status).toBe(
    202,
  );
  const row = (await owner.get("/api/enrollment/requests")).body.find(
    (x: any) => x.email === "second@example.com",
  );
  expect(
    (
      await owner
        .post(`/api/enrollment/requests/${row.id}/status`)
        .set(headers)
        .send({ status: "rejected" })
    ).status,
  ).toBe(200);
  expect(
    (await owner.delete(`/api/enrollment/requests/${row.id}`).set(headers))
      .status,
  ).toBe(200);
  expect(await db.enrollmentRequest.count()).toBe(1);
});
it("protege contra automação, replay e expiração", async () => {
  let challenge = (await request(app).get(`/api/public/enrollment/${token}`))
    .body.challenge;
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .send({ ...form, challenge })
    ).status,
  ).toBe(400);
  challenge = await proof();
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .send({ ...form, challenge, website: "spam" })
    ).status,
  ).toBe(400);
  await db.enrollmentChallenge.update({
    where: { id: sessionKey(challenge) },
    data: { expiresAt: new Date(0) },
  });
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .send({ ...form, challenge })
    ).status,
  ).toBe(400);
  challenge = await proof();
  const body = { ...form, challenge };
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .send(body)
    ).status,
  ).toBe(202);
  expect(
    (
      await request(app)
        .post(`/api/public/enrollment/${token}`)
        .set(headers)
        .send(body)
    ).status,
  ).toBe(400);
});
it("limita requisições públicas", async () => {
  for (let i = 0; i < 30; i++)
    await request(app).get("/api/public/enrollment/invalid");
  expect(
    (await request(app).get("/api/public/enrollment/invalid")).status,
  ).toBe(429);
});
it("aplica retenção somente a pendentes e recusados", async () => {
  expect(
    (await submit({ ...form, email: "retention@example.com" })).status,
  ).toBe(202);
  await db.enrollmentRequest.updateMany({
    where: { status: "pending" },
    data: { updatedAt: new Date(0) },
  });
  expect((await purgeEnrollments(db)).count).toBe(1);
  expect(await db.enrollmentRequest.count()).toBe(1);
});
it("desativa e rotaciona link sem apagar fichas", async () => {
  const old = token;
  expect((await owner.delete("/api/enrollment/link").set(headers)).status).toBe(
    200,
  );
  expect((await request(app).get(`/api/public/enrollment/${old}`)).status).toBe(
    404,
  );
  expect(
    (
      await owner
        .post("/api/enrollment/link")
        .set(headers)
        .send({
          publicName: "Personal Público",
          contact: "contato@example.com",
        })
    ).status,
  ).toBe(201);
  token = (await owner.get("/api/enrollment/link")).body.token;
  expect(token).not.toBe(old);
  expect((await request(app).get(`/api/public/enrollment/${old}`)).status).toBe(
    404,
  );
  expect(
    (await request(app).get(`/api/public/enrollment/${token}`)).status,
  ).toBe(200);
  expect(await db.enrollmentRequest.count()).toBe(1);
});
