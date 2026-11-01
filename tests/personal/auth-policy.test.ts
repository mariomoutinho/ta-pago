import { afterAll, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createApp } from "../../server/app";
import { createDb } from "../../server/db";
import { hashPassword, newToken, sessionKey } from "../../server/security";

const folder = mkdtempSync(path.join(tmpdir(), "tapago-auth-policy-"));
const url = `file:${folder}/test.db`;
const db = createDb(url);
const app = createApp(db, { authorizedPersonalIds: ["approved-personal"] });
const headers = { "X-Requested-With": "TaPago" };
const password = "senha-sintetica-12345";
beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe",
  });
  for (const [id, email] of [["approved-personal", "approved@example.test"], ["unapproved-personal", "unapproved@example.test"]]) {
    await db.user.create({ data: { id, email, name: "Responsável Sintético", role: "personal", passwordHash: await hashPassword(password) } });
  }
}, 60000);
afterAll(async () => { await db.$disconnect(); rmSync(folder, { recursive: true, force: true }); });

it("recusa cadastro público de personal, inclusive com nome e ID do autorizado", async () => {
  const count = await db.user.count();
  const result = await request(app).post("/api/auth/register").set(headers).send({
    name: "Responsável Sintético", email: "forged@example.test", password, role: "personal", id: "approved-personal",
    authorizedPersonalIds: ["approved-personal"], approved: true,
  });
  expect(result.status).toBe(403);
  expect(result.headers["set-cookie"]).toBeUndefined();
  expect(await db.user.count()).toBe(count);
});
it("mantém cadastro e login de aluno sem permitir autoautorização", async () => {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").set(headers).send({ name: "Aluno Sintético", email: "student@example.test", password, role: "student", approved: true });
  expect(result.status).toBe(201);
  expect(result.body.user.role).toBe("student");
  expect((await agent.get("/api/students")).status).toBe(403);
  expect((await agent.get("/api/me/students")).status).toBe(200);
});
it("preserva login e sessão do personal autorizado por ID", async () => {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/login").set(headers).send({ email: "approved@example.test", password });
  expect(result.status).toBe(200);
  expect((await agent.get("/api/auth/status")).body.user.id).toBe("approved-personal");
  expect((await agent.get("/api/students")).status).toBe(200);
});
it("bloqueia login de outro personal com o mesmo nome", async () => {
  const result = await request(app).post("/api/auth/login").set(headers).send({ email: "unapproved@example.test", password });
  expect(result.status).toBe(403);
  expect(result.headers["set-cookie"]).toBeUndefined();
  expect((await request(app).post("/api/auth/login").set(headers).send({ email: "unapproved@example.test", password: "senha-incorreta-123" })).status).toBe(401);
});
it("revoga também sessões e tokens emitidos antes da restrição", async () => {
  for (const id of ["approved-personal", "unapproved-personal"]) {
    const token = newToken();
    await db.session.create({ data: { id: sessionKey(token), userId: id, expiresAt: new Date(Date.now() + 60000) } });
    const deniedApp = id === "approved-personal" ? createApp(db, { authorizedPersonalIds: [] }) : app;
    expect((await request(deniedApp).get("/api/auth/status").set("Authorization", `Bearer ${token}`)).body.user).toBeNull();
    for (const route of ["/students", "/exercises", "/programs", "/templates", "/enrollment/links"]) {
      expect((await request(deniedApp).get("/api" + route).set("Cookie", `tapago_session=${token}`)).status).toBe(401);
    }
  }
  expect(await db.user.count({ where: { role: "personal" } })).toBe(2);
});
