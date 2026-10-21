import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Server } from "node:http";
import { createDb } from "../../../server/db";
import { createApp } from "../../../server/app";
import { seed } from "../../../server/seed";
const folder = mkdtempSync(path.join(tmpdir(), "tapago-browser-")),
  url = `file:${folder}/test.db`;
const db = createDb(url);
let server: Server;
let base: string;
test.beforeAll(async () => {
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  await seed(db);
  process.env.PERSONAL_APP_ORIGINS = "http://127.0.0.1:3197";
  process.env.PERSONAL_ENROLLMENT_ORIGIN = "http://127.0.0.1:3197";
  process.env.PERSONAL_ENROLLMENT_KEY = "cd".repeat(32);
  server = createApp(db).listen(3197, "127.0.0.1");
  base = "http://127.0.0.1:3197";
});
test.afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
  await db.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});
test("cadastro, navegação, aluno persistente e layout móvel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("BROWSER ERROR", e.message);
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await page.getByLabel("Seu nome", { exact: true }).fill("Personal Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("browser@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-ficticia-12345");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByText("Personal Teste", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(base + "/alunos");
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  await page
    .getByLabel("Nome completo *", { exact: true })
    .fill("Aluno Browser");
  await page
    .getByLabel("Objetivo principal *", { exact: true })
    .fill("Melhorar força");
  await page.getByRole("button", { name: "Salvar aluno", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aluno Browser" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Aluno Browser" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/personal-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: "test-results/personal-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("link local, formulário público em cinco etapas e aprovação", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.request.post(base + "/api/auth/register", {
    headers: { "X-Requested-With": "TaPago" },
    data: {
      name: "Personal Cadastro",
      email: "enrollment-browser@example.com",
      password: "senha-ficticia-12345",
      role: "personal",
    },
  });
  await page.goto(base + "/alunos");
  await page
    .getByRole("button", { name: "Link de Cadastro", exact: true })
    .click();
  await page
    .getByLabel("Contato público para privacidade (e-mail ou telefone)")
    .fill("contato@example.com");
  await page
    .getByRole("button", { name: "Gerar meu link", exact: true })
    .click();
  await expect(page.getByLabel("URL de cadastro")).toBeVisible();
  const link = await page.getByLabel("URL de cadastro").inputValue();
  expect(link).toMatch(/^http:\/\/127.0.0.1:3197\/cadastro\/[a-f0-9]{64}$/);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar link", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await page.screenshot({
    path: "test-results/enrollment-link.png",
    fullPage: true,
  });
  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const form = await publicContext.newPage();
  form.on("pageerror", (e) => errors.push(e.message));
  await form.goto(link);
  await expect(form.getByText("Boas-vindas!", { exact: false })).toBeVisible();
  await form
    .getByLabel("Nome completo *", { exact: true })
    .fill("Aluno Público");
  await form.getByLabel("E-mail *", { exact: true }).fill("public@example.com");
  await form.getByLabel("WhatsApp *", { exact: true }).fill("11987654321");
  await form.getByRole("button", { name: "Avançar", exact: true }).click();
  await form
    .getByRole("checkbox", { name: "Hipertrofia", exact: true })
    .click();
  await form.getByRole("button", { name: "Avançar", exact: true }).click();
  await form
    .getByLabel("Disponibilidade semanal *", { exact: true })
    .fill("Segunda e quarta");
  await form.getByRole("button", { name: "Avançar", exact: true }).click();
  await form
    .getByLabel("Adaptações necessárias", { exact: true })
    .fill("Adaptar movimento de teste");
  const health = form.getByRole("checkbox", {
    name: "Autorizo o tratamento",
    exact: false,
  });
  await expect(health).not.toBeChecked();
  await health.click();
  await form.getByRole("button", { name: "Avançar", exact: true }).click();
  const consent = form.getByRole("checkbox", {
    name: "Li a política",
    exact: false,
  });
  await expect(consent).not.toBeChecked();
  await consent.click();
  await form.screenshot({
    path: "test-results/enrollment-mobile.png",
    fullPage: true,
  });
  await db.enrollmentChallenge.updateMany({
    data: { createdAt: new Date(Date.now() - 3000) },
  });
  await form
    .getByRole("button", { name: "Concluir cadastro", exact: true })
    .click();
  await expect(
    form.getByText("Cadastro enviado!", { exact: true }),
  ).toBeVisible();
  expect(
    await form.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("radio", { name: "Seção: Contatos", exact: true })
    .click();
  await expect(page.getByText("Aluno Público", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Pendente", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver ficha", exact: true }).click();
  await expect(
    page.getByText("Adaptar movimento de teste", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect(page.getByText("Ativo", { exact: true }).last()).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir acompanhamento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aluno Público" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await publicContext.close();
});

test("prescrição completa no mobile e leitura do aluno em conta própria", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", {
    headers,
    data: {
      name: "Personal Treinos",
      email: "workout-browser@example.com",
      password: "senha-ficticia-12345",
      role: "personal",
    },
  });
  const created = await page.request.post(base + "/api/students", {
    headers,
    data: {
      name: "Aluno Treinos",
      mainGoal: "Força",
      startDate: "2026-10-01",
    },
  });
  const studentId = (await created.json()).id;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + `/alunos/${studentId}`);
  await page
    .getByRole("radio", { name: "Prontuário: Treinos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Criar treino", exact: true })
    .click();
  await page
    .getByLabel("Nome do plano *", { exact: true })
    .fill("Adaptação funcional");
  await page
    .getByRole("button", { name: "+ Adicionar treino", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Adicionar exercício", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Criar exercício", exact: true })
    .click();
  await page
    .getByLabel("Nome do exercício *", { exact: true })
    .fill("Supino de teste");
  await page.getByLabel("Grupo muscular *", { exact: true }).fill("Peitoral");
  await page.getByLabel("Categoria *", { exact: true }).fill("Musculação");
  await page
    .getByRole("button", { name: "Salvar exercício", exact: true })
    .click();
  await page.getByLabel("Séries", { exact: true }).fill("4");
  await page
    .getByLabel("Repetições (ex.: 10 ou 8-12)", { exact: true })
    .fill("10");
  await page.getByLabel("Carga (kg)", { exact: true }).fill("60");
  await page.getByLabel("Descanso (segundos)", { exact: true }).fill("90");
  await page
    .getByLabel("Observações da prescrição", { exact: true })
    .fill("Controle o movimento");
  await page
    .getByRole("button", { name: "Confirmar prescrição", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Status do plano: ativo", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar plano", exact: true }).click();
  await expect(
    page.getByText("Plano salvo com sucesso.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("radio", { name: "Prontuário: Treinos", exact: true })
    .click();
  await expect(
    page.getByText("Adaptação funcional", { exact: true }),
  ).toBeVisible();
  const invite = await page.request.post(
    base + `/api/students/${studentId}/invite`,
    { headers },
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const pupil = await context.newPage();
  pupil.on("pageerror", (e) => errors.push(e.message));
  await pupil.request.post(base + "/api/auth/register", {
    headers,
    data: {
      name: "Aluno Treinos",
      email: "workout-pupil@example.com",
      password: "senha-ficticia-12345",
      role: "student",
    },
  });
  await pupil.request.post(base + "/api/me/claim", {
    headers,
    data: { code: (await invite.json()).code },
  });
  await pupil.goto(base + "/treinos");
  await pupil.getByRole("button", { name: "Treino A", exact: true }).click();
  await expect(
    pupil.getByText("Supino de teste", { exact: true }),
  ).toBeVisible();
  await expect(pupil.getByText("4 séries", { exact: true })).toBeVisible();
  await expect(pupil.getByText("60 kg", { exact: true })).toBeVisible();
  await expect(
    pupil.getByText("Descanso: 90 s", { exact: true }),
  ).toBeVisible();
  await expect(
    pupil.getByText("Controle o movimento", { exact: true }),
  ).toBeVisible();
  await expect(
    pupil.getByRole("button", { name: "Editar plano", exact: true }),
  ).toHaveCount(0);
  expect(
    await pupil.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await pupil.screenshot({
    path: "test-results/workouts-mobile.png",
    fullPage: true,
  });
  await pupil.setViewportSize({ width: 1280, height: 900 });
  await pupil.screenshot({
    path: "test-results/workouts-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await context.close();
});
