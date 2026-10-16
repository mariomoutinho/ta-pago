import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb, type Db } from "../../server/db";
import { createApp } from "../../server/app";
import { seed } from "../../server/seed";
import type { Template } from "../../src/features/personal/types";
const folder = mkdtempSync(path.join(tmpdir(), "compasso-test-"));
const url = `file:${folder}/test.db`;
let db: Db;
let app: ReturnType<typeof createApp>;
let agent: ReturnType<typeof request.agent>;
let studentId: string;
let template: Template;
let evaluationId: string;
const student = {
  name: "Aluna de teste",
  mainGoal: "Melhorar força",
  startDate: "2026-01-01",
  weeklyFrequency: 3,
  injuries: "Observação privada de teste",
};
const header = { "X-Requested-With": "TaPago" };
beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    {
      env: { ...process.env, PERSONAL_DATABASE_URL: url },
      stdio: "pipe",
    },
  );
  db = createDb(url);
  await seed(db);
  app = createApp(db);
  agent = request.agent(app);
}, 60000);
afterAll(async () => {
  await db?.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});
describe("API com SQLite real", () => {
  it("bloqueia leitura sem autenticação e escrita sem proteção CSRF", async () => {
    expect((await request(app).get("/api/students")).status).toBe(401);
    expect(
      (await request(app).post("/api/auth/register").send({})).status,
    ).toBe(403);
  });
  it("recusa email duplicado com cookie restrito e senha protegida", async () => {
    const res = await agent.post("/api/auth/register").set(header).send({
      role: "personal",
      name: "Personal Teste",
      email: "test@example.com",
      password: "senha-apenas-de-teste-123",
    });
    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(res.headers["set-cookie"][0]).toContain("SameSite=Strict");
    const user = await db.user.findFirstOrThrow();
    expect(user.passwordHash).not.toContain("senha-apenas");
    expect(
      (
        await agent.post("/api/auth/register").set(header).send({
          role: "personal",
          name: "Outro",
          email: "test@example.com",
          password: "senha-apenas-de-teste-123",
        })
      ).status,
    ).toBe(409);
  });
  it("recusa origem externa", async () => {
    expect(
      (
        await agent
          .post("/api/students")
          .set(header)
          .set("Origin", "https://externo.example")
          .send(student)
      ).status,
    ).toBe(403);
  });
  it("valida e cria aluno persistente", async () => {
    expect(
      (
        await agent
          .post("/api/students")
          .set(header)
          .send({ ...student, weeklyFrequency: 0 })
      ).status,
    ).toBe(400);
    const res = await agent.post("/api/students").set(header).send(student);
    expect(res.status).toBe(201);
    studentId = res.body.id;
    expect((await agent.get("/api/students")).body).toHaveLength(1);
  });
  it("mantém dados após desconectar e abrir outro cliente", async () => {
    await db.$disconnect();
    const another = createDb(url);
    expect(
      (await another.student.findUniqueOrThrow({ where: { id: studentId } }))
        .name,
    ).toBe(student.name);
    await another.$disconnect();
  });
  it("oferece questionário completo e seed idempotente", async () => {
    await seed(db);
    const res = await agent.get("/api/templates");
    expect(res.body).toHaveLength(1);
    template = res.body[0];
    expect(template.questions).toHaveLength(33);
    expect(template.questions[0].options.map((o) => o.label)).toEqual([
      "Muito difícil",
      "Difícil",
      "Razoável",
      "Boa",
      "Muito boa",
    ]);
  });
  it("salva rascunho parcial e impede conclusão incompleta", async () => {
    const data = {
      templateId: template.id,
      date: "2026-01-30",
      cycle: 1,
      evaluator: "Personal",
      status: "rascunho",
      answers: [{ questionId: template.questions[0].id, value: "Boa" }],
    };
    const res = await agent
      .post(`/api/students/${studentId}/evaluations`)
      .set(header)
      .send(data);
    expect(res.status).toBe(201);
    evaluationId = res.body.id;
    expect(
      (
        await agent
          .put(`/api/students/${studentId}/evaluations/${evaluationId}`)
          .set(header)
          .send({ ...data, status: "concluida" })
      ).status,
    ).toBe(400);
  });
  it("rejeita opções falsas e perguntas de outro modelo", async () => {
    for (const answer of [
      { questionId: template.questions[0].id, value: "Inventada" },
      { questionId: "outra-pergunta", value: "Boa" },
    ])
      expect(
        (
          await agent
            .post(`/api/students/${studentId}/evaluations`)
            .set(header)
            .send({
              templateId: template.id,
              date: "2026-01-30",
              cycle: 1,
              evaluator: "Personal",
              status: "rascunho",
              answers: [answer],
            })
        ).status,
      ).toBe(400);
  });
  it("conclui sem permitir sobrescrita do histórico", async () => {
    const data = {
      templateId: template.id,
      date: "2026-01-30",
      cycle: 1,
      evaluator: "Personal",
      status: "concluida",
      answers: template.questions.map((q) => ({
        questionId: q.id,
        value: q.type === "choice" ? q.options[0].label : "Relato de teste",
      })),
    };
    expect(
      (
        await agent
          .put(`/api/students/${studentId}/evaluations/${evaluationId}`)
          .set(header)
          .send(data)
      ).status,
    ).toBe(200);
    expect(
      (await db.student.findUniqueOrThrow({ where: { id: studentId } }))
        .nextEvaluationDate,
    ).toBe("2026-03-01");
    expect(
      (
        await agent
          .put(`/api/students/${studentId}/evaluations/${evaluationId}`)
          .set(header)
          .send({ ...data, status: "rascunho" })
      ).status,
    ).toBe(409);
    expect(
      (
        await agent
          .delete(`/api/students/${studentId}/evaluations/${evaluationId}`)
          .set(header)
      ).status,
    ).toBe(409);
  });
  it("cria versão sem alterar perguntas históricas", async () => {
    const res = await agent
      .post("/api/templates")
      .set(header)
      .send({
        name: template.name,
        cycleDays: 45,
        questions: [
          {
            dimension: "Nova",
            text: "Nova pergunta?",
            type: "scale",
            min: 0,
            max: 10,
          },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.version).toBe(2);
    const current = await db.evaluation.findUniqueOrThrow({
      where: { id: evaluationId },
      include: { template: { include: { questions: true } } },
    });
    expect(current.template.questions).toHaveLength(33);
  });
  it("valida respostas numéricas nos modelos configuráveis", async () => {
    const t = (await agent.get("/api/templates")).body.find(
      (t: Template) => t.version === 2,
    );
    const data = {
      templateId: t.id,
      date: "2026-02-28",
      cycle: 2,
      evaluator: "Personal",
      status: "concluida",
      answers: [{ questionId: t.questions[0].id, value: "11" }],
    };
    expect(
      (
        await agent
          .post(`/api/students/${studentId}/evaluations`)
          .set(header)
          .send(data)
      ).status,
    ).toBe(400);
    data.answers[0].value = "8";
    expect(
      (
        await agent
          .post(`/api/students/${studentId}/evaluations`)
          .set(header)
          .send(data)
      ).status,
    ).toBe(201);
  });
  it("mantém ciclos mensais separados e histórico de correções", async () => {
    const data = {
      kind: "monthly",
      date: "2026-01-30",
      data: {
        cycle: 1,
        planned: 12,
        completed: 9,
        rpe: 6,
        cardioMinutes: 60,
        notes: "Primeiro mês",
      },
    };
    const res = await agent
      .post(`/api/students/${studentId}/records`)
      .set(header)
      .send(data);
    expect(res.status).toBe(201);
    expect(
      (
        await agent
          .post(`/api/students/${studentId}/records`)
          .set(header)
          .send({
            ...data,
            date: "2026-02-28",
            data: { ...data.data, cycle: 2, completed: 11 },
          })
      ).status,
    ).toBe(201);
    expect(
      (
        await agent
          .put(`/api/students/${studentId}/records/${res.body.id}`)
          .set(header)
          .send({ ...data, data: { ...data.data, completed: 10 } })
      ).status,
    ).toBe(200);
    const s = (await agent.get(`/api/students/${studentId}`)).body;
    expect(s.records).toHaveLength(2);
    expect(
      s.history.some(
        (h: { action: string }) => h.action === "Registro corrigido",
      ),
    ).toBe(true);
    expect(JSON.stringify(s.history)).toContain('"completed":9');
  });
  it("edita cadastro e exporta somente o prontuário", async () => {
    expect(
      (
        await agent
          .put(`/api/students/${studentId}`)
          .set(header)
          .send({ ...student, status: "pausado" })
      ).status,
    ).toBe(200);
    const exported = await agent.get(`/api/students/${studentId}/export`);
    expect(exported.status).toBe(200);
    const body = JSON.parse(exported.text);
    expect(body.student.evaluations).toHaveLength(2);
    expect(body.student.records).toHaveLength(2);
    expect(exported.text).not.toContain("passwordHash");
    expect(exported.headers["content-disposition"]).toContain("attachment");
  });
  it("executa CRUD de programas com proteção de vínculos", async () => {
    const data = {
      name: "Força inicial",
      description: "Ciclo",
      weeklyFrequency: 3,
      cycleDays: 30,
      sessions: "Anterior, posterior, cardio",
    };
    const p = await agent.post("/api/programs").set(header).send(data);
    expect(p.status).toBe(201);
    const historical = await agent
      .post(`/api/students/${studentId}/evaluations`)
      .set(header)
      .send({
        templateId: template.id,
        date: "2026-03-30",
        cycle: 3,
        evaluator: "Personal",
        programId: p.body.id,
        status: "concluida",
        answers: template.questions.map((q) => ({
          questionId: q.id,
          value: q.type === "choice" ? q.options[0].label : "Relato",
        })),
      });
    expect(historical.status).toBe(201);

    expect(
      (
        await agent
          .put(`/api/programs/${p.body.id}`)
          .set(header)
          .send({ ...data, cycleDays: 45 })
      ).status,
    ).toBe(200);
    await agent
      .put(`/api/students/${studentId}`)
      .set(header)
      .send({ ...student, programId: p.body.id });
    expect(
      (await agent.delete(`/api/programs/${p.body.id}`).set(header)).status,
    ).toBe(409);
    await agent.put(`/api/students/${studentId}`).set(header).send(student);
    expect(
      (await agent.delete(`/api/programs/${p.body.id}`).set(header)).status,
    ).toBe(200);
    const preserved = await db.evaluation.findUniqueOrThrow({
      where: { id: historical.body.id },
    });
    expect(preserved.programId).toBeNull();
    expect(JSON.parse(preserved.programSnapshot).cycleDays).toBe(30);
  });
  it("exclui aluno e remove todos os registros pessoais em cascata", async () => {
    expect(
      (await agent.delete(`/api/students/${studentId}`).set(header)).status,
    ).toBe(200);
    expect(await db.evaluation.count()).toBe(0);
    expect(await db.evaluationAnswer.count()).toBe(0);
    expect(await db.trackingRecord.count()).toBe(0);
    expect(await db.historyEntry.count()).toBe(0);
    expect((await agent.get(`/api/students/${studentId}/export`)).status).toBe(
      404,
    );
  });
  it("encerra sessão, recusa senha errada e aceita login válido", async () => {
    expect((await agent.post("/api/auth/logout").set(header)).status).toBe(200);
    expect((await agent.get("/api/students")).status).toBe(401);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set(header)
          .send({ email: "test@example.com", password: "senha-incorreta-123" })
      ).status,
    ).toBe(401);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set(header)
          .send({
            email: "test@example.com",
            password: "senha-apenas-de-teste-123",
          })
      ).status,
    ).toBe(200);
  });
});
