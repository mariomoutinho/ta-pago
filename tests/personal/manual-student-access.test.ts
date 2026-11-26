import { beforeAll, afterAll, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { createTestApp, provisionPersonal } from "./fixtures";

const folder = fs.mkdtempSync(path.join(tmpdir(), "manual-student-"));
const url = `file:${folder}/test.db`, db = createDb(url), app = createTestApp(db);
const owner = request.agent(app), other = request.agent(app);
const headers = { "X-Requested-With": "TaPago" };
let studentId: string;
let accessCode: string;
beforeAll(async () => {
  fs.writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe",
  });
  for (const [agent, email] of [[owner, "manual-owner@example.test"], [other, "manual-other@example.test"]] as const) {
    await provisionPersonal(db, { name: "Professor Sintético", email, password: "teste123" });
    await agent.post("/api/auth/login").set(headers).send({ email, password: "teste123" }).expect(200);
  }
}, 60000);
afterAll(async () => { await db.$disconnect(); fs.rmSync(folder, { recursive: true, force: true }); });

it("salva grupo e gera convite de ativação para cadastro manual em uma operação", async () => {
  const response = await owner.post("/api/students").set(headers).send({
    name: "Leo", email: "manual-leo@example.test", phone: "+5511999990000", sex: "Masculino",
    startDate: "2026-11-26", birthDate: "2000-01-01", trainingGroup: "Turma manhã", sendAccess: true,
  }).expect(201);
  studentId = response.body.id; accessCode = response.body.accessCode;
  expect(response.body.trainingGroup).toBe("Turma manhã");
  expect(response.body.mainGoal).toBe("");
  expect(accessCode).toMatch(/^[a-f0-9]{64}$/);
  expect(await db.enrollmentRequest.findUnique({ where: { studentId } })).toBeNull();
  expect((await owner.get("/api/student-groups").expect(200)).body).toEqual(["Turma manhã"]);
  expect((await other.get("/api/student-groups").expect(200)).body).toEqual([]);
  await other.get(`/api/students/${studentId}`).expect(404);
});

it("recusa envio sem contatos e não deixa cadastro parcial", async () => {
  const before = await db.student.count();
  await owner.post("/api/students").set(headers).send({ name: "Aluno inválido", startDate: "2026-11-26", sendAccess: true }).expect(400);
  expect(await db.student.count()).toBe(before);
});

it("ativa conta e vínculo do aluno cadastrado manualmente, sem reutilizar convite", async () => {
  const info = await request(app).get(`/api/public/student-access/${accessCode}`).expect(200);
  expect(info.body.existingAccount).toBe(false);
  await request(app).post(`/api/public/student-access/${accessCode}`).set(headers).send({ password: "leo123" }).expect(201);
  const user = await db.user.findUniqueOrThrow({ where: { email: "manual-leo@example.test" } });
  expect((await db.student.findUniqueOrThrow({ where: { id: studentId } })).accountId).toBe(user.id);
  await request(app).get(`/api/public/student-access/${accessCode}`).expect(400);
  await request(app).post("/api/auth/login").set(headers).send({ email: user.email, password: "leo123" }).expect(200);
});
