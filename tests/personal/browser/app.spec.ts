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
