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
    process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
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
  await page
    .getByRole("button", { name: "+ Adicionar aluno", exact: true })
    .click();
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
    .getByRole("button", { name: "Treinos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Criar rotina", exact: true })
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
  await page.getByRole("button", { name: "Listar Grupo muscular", exact: true }).click();
  await page.getByRole("button", { name: "Grupo muscular: Peitoral", exact: true }).click();
  await expect(page.getByLabel("Grupo muscular *", { exact: true })).toHaveValue("Peitoral");
  await page.getByRole("button", { name: "Listar Categoria", exact: true }).click();
  await page.getByRole("button", { name: "Categoria: Musculação", exact: true }).click();
  await expect(page.getByLabel("Categoria *", { exact: true })).toHaveValue("Musculação");
  await page
    .getByLabel("Vídeo (URL http/https)", { exact: true })
    .fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
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
    .getByRole("button", { name: "Treinos", exact: true })
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
  await pupil.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Player de teste" }),
  );
  await pupil.goto(base + "/treinos");
  await pupil.getByRole("button", { name: "Abrir rotina Adaptação funcional", exact: true }).click();
  await pupil.getByRole("button", { name: "Terminei: enviar feedback", exact: true }).click();
  await pupil.getByLabel("Seu feedback", { exact: true }).fill("Treino concluído. A última série foi desafiadora.");
  await pupil.getByRole("button", { name: "Registrar feedback", exact: true }).click();
  await expect(pupil.getByText("Feedback registrado e disponível para o personal.", { exact: true })).toBeVisible();
  await pupil.reload();
  await pupil.getByRole("button", { name: "Abrir rotina Adaptação funcional", exact: true }).click();
  await pupil.getByRole("button", { name: "Feedbacks (1)", exact: true }).click();
  await expect(pupil.getByText("Treino concluído. A última série foi desafiadora.", { exact: true })).toBeVisible();
  await pupil.getByRole("button", { name: "Fechar", exact: true }).click();
  await pupil.getByRole("button", { name: "Treino A", exact: true }).click();

  await pupil.getByRole("button", { name: "Detalhes de Supino de teste", exact: true }).click();
  await expect(
    pupil.getByText("Supino de teste", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    pupil.getByTitle("Vídeo: Supino de teste", { exact: true }),
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
  await page.getByRole("button", { name: "Opções da rotina Adaptação funcional", exact: true }).click();
  await page.getByRole("button", { name: "Arquivar plano", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Plano arquivado.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir rotina Adaptação funcional", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Arquivadas", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir rotina Adaptação funcional", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/routines-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Abrir rotina Adaptação funcional", exact: true }).click();
  await expect(page.getByRole("button", { name: "Treino A", exact: true })).toBeVisible();
  await expect(page.getByText("Visibilidade para o aluno", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ Adicionar treino", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recolher treino", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByRole("button", { name: "Reordenar treinos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Subir treino 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.screenshot({ path: "test-results/routine-details-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Treino A", exact: true }).click();
  await expect(page.getByRole("button", { name: "Detalhes de Supino de teste", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Detalhes de Supino de teste", exact: true }).click();
  await page.getByLabel("Série/repetições 1", { exact: true }).fill("3/15");
  await page.getByLabel("Carga 1", { exact: true }).filter({ visible: true }).fill("15");
  await page.getByLabel("Intervalo 1", { exact: true }).fill("60");
  await page.getByRole("button", { name: "Replicar séries", exact: true }).click();
  await expect(page.getByLabel("Carga 2", { exact: true })).toHaveValue("15");
  await page.getByRole("button", { name: "Excluir série 2", exact: true }).click();
  await page.getByRole("button", { name: "Salvar como preset", exact: true }).click();
  await page.getByLabel("Nome do preset", { exact: true }).fill("Base de teste");
  await page.getByRole("button", { name: "Salvar preset", exact: true }).click();
  await expect(page.getByText("Preset salvo. A prescrição do aluno só muda ao salvar a prescrição.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar preset", exact: true }).click();
  await page.getByRole("button", { name: "Base de teste", exact: true }).click();
  await expect(page.getByLabel("Série/repetições 2", { exact: true })).toHaveValue("3/15");
  await page.getByRole("button", { name: "Salvar prescrição", exact: true }).click();
  await expect(page.getByText("Prescrição salva.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/series-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Treino A", exact: true }).click();
  await page.getByRole("button", { name: "Detalhes de Supino de teste", exact: true }).click();
  await expect(page.getByLabel("Série/repetições 2", { exact: true })).toHaveValue("3/15");
  await page.getByRole("button", { name: "Adicionar exercício", exact: true }).click();
  await expect(page.getByRole("button", { name: "+ Criar exercício", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ Criar exercício", exact: true }).click();
  const exerciseName = page.getByLabel("Nome do exercício *", { exact: true });
  await exerciseName.click();
  await exerciseName.pressSequentially("Exercício novo");
  await expect(exerciseName).toHaveValue("Exercício novo");
  await page.getByLabel("Grupo muscular *", { exact: true }).fill("Pernas");
  await page.getByLabel("Categoria *", { exact: true }).fill("Força");
  await page.getByRole("button", { name: "Fechar biblioteca", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByRole("button", { name: "Feedbacks (1)", exact: true }).click();
  await expect(page.getByText("Treino concluído. A última série foi desafiadora.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar feedback", exact: true })).toHaveCount(0);


  expect(errors).toEqual([]);
  await context.close();
});

test("vídeo YouTube aparece dentro da biblioteca sem navegar para outra página", async ({
  page,
}) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", {
    headers,
    data: {
      name: "Personal Vídeo",
      email: "video-browser@example.com",
      password: "senha-ficticia-12345",
      role: "personal",
    },
  });
  await page.request.post(base + "/api/exercises", {
    headers,
    data: {
      name: "Supino com vídeo",
      muscleGroup: "Peitoral",
      category: "Musculação",
      videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    },
  });
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<button aria-label="Reproduzir">Reproduzir</button>',
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(base + "/exercicios");
  expect(response?.headers()["content-security-policy"]).toContain(
    "https://www.youtube-nocookie.com",
  );
  const player = page.getByTitle("Vídeo: Supino com vídeo", { exact: true });
  await expect(player).toHaveCount(0);
  await page.getByRole("button", { name: "Expandir exercício Supino com vídeo", exact: true }).click();
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&rel=0",
  );
  await page
    .frameLocator('iframe[title="Vídeo: Supino com vídeo"]')
    .getByRole("button", { name: "Reproduzir" })
    .click();
  expect(page.url()).toBe(base + "/exercicios");
  expect(page.context().pages()).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Abrir vídeo", exact: true }),
  ).toHaveCount(0);
  const bounds = await player.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.height).toBeGreaterThanOrEqual(200);
  await page.getByRole("button", { name: "Recolher exercício Supino com vídeo", exact: true }).click();
  await expect(player).toHaveCount(0);
});

test("home organiza ações do personal, mostra dados reais e adapta larguras", async ({
  page,
}) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", {
    headers,
    data: {
      name: "Personal Painel",
      email: "dashboard-browser@example.com",
      password: "senha-ficticia-12345",
      role: "personal",
    },
  });
  await page.request.post(base + "/api/students", {
    headers,
    data: {
      name: "Aluno Painel",
      mainGoal: "Força",
      startDate: "2026-10-01",
      weeklyFrequency: 3,
    },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await expect(page.getByText("Ativos: 1", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar aluno", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome completo *", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Link de cadastro", exact: true })
    .click();
  await expect(page).toHaveURL(base + "/alunos/link");
  await page.goto(base);
  await page
    .getByRole("button", { name: "Biblioteca de exercícios", exact: true })
    .click();
  await expect(page).toHaveURL(base + "/exercicios");
  await page.goto(base);
  await page
    .getByRole("button", { name: "Prescrever treino", exact: true })
    .click();
  await expect(page).toHaveURL(base + "/alunos");
  await page.goto(base);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "Adicionar aluno", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1280) {
      await page.screenshot({
        path: `test-results/dashboard-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Início", exact: true }),
  ).toHaveCSS("background-color", "rgb(57, 22, 29)");
  await page.screenshot({
    path: "test-results/dashboard-dark.png",
    fullPage: true,
  });
});

test("lista compacta busca nome, e-mail e telefone e filtra status", async ({
  page,
}) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", {
    headers,
    data: {
      name: "Personal Lista",
      email: "list-browser@example.com",
      password: "senha-ficticia-12345",
      role: "personal",
    },
  });
  for (const data of [
    {
      name: "Ágata Teste",
      email: "agata@example.com",
      phone: "(11) 99999-1234",
      status: "ativo",
    },
    {
      name: "Bruno Teste",
      email: "bruno@example.com",
      phone: "",
      status: "inativo",
    },
    {
      name: "Carla Teste",
      email: "carla@example.com",
      phone: "",
      status: "pausado",
    },
  ]) {
    expect(
      (
        await page.request.post(base + "/api/students", {
          headers,
          data: { ...data, mainGoal: "Força", startDate: "2026-10-01" },
        })
      ).ok(),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/alunos");
  const row = (name: string) =>
    page.getByRole("button", {
      name: `Abrir acompanhamento de ${name}`,
      exact: true,
    });
  await expect(row("Ágata Teste")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Status: Ativos: 1", exact: true }),
  ).toBeVisible();
  for (const query of [
    "agata",
    "agata@example.com",
    "11999991234",
    "(11) 99999-1234",
  ]) {
    await page.getByLabel("Buscar aluno", { exact: true }).fill(query);
    await expect(row("Ágata Teste")).toBeVisible();
    await expect(row("Bruno Teste")).toHaveCount(0);
  }
  await page.getByLabel("Buscar aluno", { exact: true }).fill("");
  await page
    .getByRole("radio", { name: "Status: Inativos: 1", exact: true })
    .click();
  await expect(row("Bruno Teste")).toBeVisible();
  await expect(row("Ágata Teste")).toHaveCount(0);
  await page
    .getByRole("radio", { name: "Status: Todos: 3", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/students-list-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await row("Ágata Teste").click();
  await expect(
    page.getByRole("heading", { name: "Ágata Teste", exact: true }),
  ).toBeVisible();
  await page.goto(base + "/alunos");
  await page.getByLabel("Buscar aluno", { exact: true }).fill("Sem resultado");
  await expect(
    page.getByText("Nenhum aluno encontrado", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar aluno", { exact: true }).fill("");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Alunos", exact: true }),
  ).toHaveCSS("background-color", "rgb(57, 22, 29)");
  await page.screenshot({
    path: "test-results/students-list-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/students-list-desktop.png",
    fullPage: true,
  });
});

test("perfil compacto preserva atalhos, opções e anotações", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: {
    name: "Personal Perfil", email: "profile-browser@example.com", password: "senha-ficticia-12345", role: "personal",
  } });
  const response = await page.request.post(base + "/api/students", { headers, data: {
    name: "Aluno Perfil", mainGoal: "Condicionamento", startDate: "2026-10-01", weeklyFrequency: 3,
  } });
  const id = (await response.json()).id;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + `/alunos/${id}`);
  await expect(page.getByRole("tab", { name: "Início", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Sem registros", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar anotação", exact: true }).click();
  await page.getByLabel("Observação profissional *", { exact: true }).fill("Revisar evolução no próximo encontro.");
  await page.getByRole("button", { name: "Salvar registro", exact: true }).click();
  await expect(page.getByText("Revisar evolução no próximo encontro.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Revisar evolução no próximo encontro.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Opções", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar cadastro", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dados do aluno e vínculo", exact: true }).click();
  await expect(page.getByText("Condicionamento", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: "Avaliações", exact: true }).click();
  await expect(page.getByRole("button", { name: "Nova avaliação", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.getByText("Frequência de treinos", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/profile-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("personal prepara treino sem aluno e copia para o perfil sem alterar o modelo", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: {
    name: "Personal Modelos", email: "templates-browser@example.com", password: "senha-ficticia-12345", role: "personal",
  } });
  await page.request.post(base + "/api/exercises", { headers, data: {
    name: "Agachamento modelo", muscleGroup: "Inferiores", category: "Musculação",
  } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/treinos-preparados");
  await page.getByRole("button", { name: "+ Criar treino preparado", exact: true }).click();
  await page.getByLabel("Nome do treino *", { exact: true }).fill("Treino de força preparado");
  await page.getByRole("button", { name: "+ Adicionar exercício", exact: true }).click();
  await page.getByRole("button", { name: "Expandir exercício Agachamento modelo", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await page.getByLabel("Séries", { exact: true }).fill("3");
  await page.getByLabel("Repetições (ex.: 10 ou 8-12)", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Confirmar prescrição", exact: true }).click();
  await page.getByRole("button", { name: "Salvar treino preparado", exact: true }).click();
  await expect(page.getByText("Treino preparado salvo.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Treino de força preparado", { exact: true })).toBeVisible();
  const templates = await (await page.request.get(base + "/api/workout-templates")).json();
  expect(templates).toHaveLength(1);
  expect(templates[0].exercises[0].sets).toBe(3);
  const created = await page.request.post(base + "/api/students", { headers, data: {
    name: "Aluno de modelo", mainGoal: "Força", startDate: "2026-10-23",
  } });
  const studentId = (await created.json()).id;
  await page.goto(base + `/alunos/${studentId}`);
  await page.getByRole("button", { name: "Treinos", exact: true }).click();
  await page.getByRole("button", { name: "Usar treino preparado", exact: true }).click();
  await page.getByRole("button", { name: "Usar treino Treino de força preparado", exact: true }).click();
  await page.getByLabel("Nome do plano *", { exact: true }).fill("Plano individual do aluno");
  await page.getByLabel("Nome do treino *", { exact: true }).fill("Treino adaptado ao aluno");
  await page.getByRole("button", { name: "Salvar plano", exact: true }).click();
  await expect(page.getByText("Plano salvo com sucesso.", { exact: true })).toBeVisible();
  const plans = await (await page.request.get(base + `/api/students/${studentId}/workout-plans`)).json();
  expect(plans[0].workouts[0].name).toBe("Treino adaptado ao aluno");
  expect(plans[0].workouts[0].exercises[0].sets).toBe(3);
  expect(plans[0].status).toBe("rascunho");
  expect((await (await page.request.get(base + "/api/workout-templates")).json())[0].name).toBe("Treino de força preparado");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/prepared-workout-mobile.png", fullPage: true });
});

test("editor compacto reordena, preserva formulários, integra ações e restaura ordem em falha", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Editor", email: "editor-browser@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const exercises = [];
  for (const name of ["Primeiro", "Segundo", "Terceiro", "Alternativo"]) exercises.push(await (await page.request.post(base + "/api/exercises", { headers, data: { name, muscleGroup: "Pernas", category: "Força" } })).json());
  const template = await (await page.request.post(base + "/api/workout-templates", { headers, data: { name: "Modelo editor", exercises: exercises.slice(0, 3).map((ex, index) => ({ exerciseId: ex.id, sets: 3, repetitions: "12", load: index + 10, notes: "Preservar" })) } })).json();
  await page.goto(base + "/treinos-preparados");
  await page.getByRole("button", { name: "Editar treino preparado Modelo editor", exact: true }).click();
  const details = (name: string) => page.getByRole("button", { name: "Detalhes de " + name, exact: true });
  const actions = (name: string) => page.getByRole("button", { name: "Ações de " + name, exact: true });
  const handle = (index: number) => page.getByRole("button", { name: "Arrastar exercício " + template.exercises[index].clientId, exact: true });
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(details("Primeiro")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Editar prescrição", exact: true })).toHaveCount(0);
  await actions("Primeiro").click();
  await expect(page.getByRole("button", { name: "Trocar exercício", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Trocar exercício", exact: true })).toHaveCount(0);
  await expect(details("Primeiro")).toHaveAttribute("aria-expanded", "false");
  await handle(2).focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByText("Ordem salva.", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Detalhes de / }).allTextContents()).toEqual(["Primeiro", "Terceiro", "Segundo"]);
  await handle(2).focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByText("Ordem salva.", { exact: true })).toBeVisible();
  let saved = (await (await page.request.get(base + "/api/workout-templates")).json())[0];
  expect(saved.exercises.map((item: { load: number }) => item.load)).toEqual([12, 10, 11]);
  await expect(details("Terceiro")).toHaveAttribute("aria-expanded", "false");
  await page.reload(); await page.getByRole("button", { name: "Editar treino preparado Modelo editor", exact: true }).click();
  expect(await page.getByRole("button", { name: /^Detalhes de / }).allTextContents()).toEqual(["Terceiro", "Primeiro", "Segundo"]);
  await page.route("**/api/workout-templates/*/order", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Falha simulada" }) }));
  await handle(0).focus(); await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByText("Falha simulada", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Detalhes de / }).allTextContents()).toEqual(["Terceiro", "Primeiro", "Segundo"]);
  await page.unroute("**/api/workout-templates/*/order");
  await details("Primeiro").click();
  await page.getByLabel("Carga 1", { exact: true }).filter({ visible: true }).fill("42");
  await details("Primeiro").click(); await details("Primeiro").click();
  await expect(page.getByLabel("Carga 1", { exact: true }).filter({ visible: true })).toHaveValue("42");
  await page.getByRole("button", { name: "Confirmar séries", exact: true }).click();
  await details("Primeiro").click();
  await actions("Primeiro").click(); await page.getByRole("button", { name: "Salvar como preset", exact: true }).click();
  await page.getByLabel("Nome do preset", { exact: true }).fill("Completo do editor");
  await page.getByRole("button", { name: "Salvar preset", exact: true }).click();
  await expect(page.getByText("Preset salvo.", { exact: true })).toBeVisible();
  await actions("Segundo").click(); await page.getByRole("button", { name: "Adicionar preset", exact: true }).click();
  await page.getByRole("button", { name: "Completo do editor", exact: true }).click();
  await actions("Primeiro").click(); await page.getByRole("button", { name: "Adicionar exercício alternativo", exact: true }).click();
  await page.getByRole("button", { name: "Expandir exercício Alternativo", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await actions("Segundo").click(); await page.getByRole("button", { name: "Trocar exercício", exact: true }).click();
  await page.getByRole("button", { name: "Expandir exercício Alternativo", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await actions("Terceiro").click(); await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).last().click(); await expect(details("Terceiro")).toBeVisible();
  await actions("Terceiro").click(); await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click(); await expect(details("Terceiro")).toHaveCount(0);
  await page.getByRole("button", { name: "Expandir todos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar prescrição", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Recolher todos", exact: true }).click();
  await page.getByRole("button", { name: "Salvar treino preparado", exact: true }).click();
  await expect(page.getByText("Treino preparado salvo.", { exact: true })).toBeVisible();
  saved = (await (await page.request.get(base + "/api/workout-templates")).json())[0];
  expect(saved.exercises).toHaveLength(2); expect(saved.exercises[0].alternativeExerciseId).toBe(exercises[3].id);
  expect(saved.exercises[1].exerciseId).toBe(exercises[3].id); expect(saved.exercises[1].series[0].load).toBe(42);
  expect((await (await page.request.get(base + "/api/exercises")).json())).toHaveLength(4);
  await page.screenshot({ path: "test-results/workout-editor-390.png", fullPage: true });
});

test("handle reordena com mouse e toque prolongado sem expandir os cards", async ({ browser }) => {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ hasTouch: touch, viewport: { width: touch ? 390 : 1280, height: 1000 } });
    const page = await context.newPage(), headers = { "X-Requested-With": "TaPago" };
    await page.request.post(base + "/api/auth/register", { headers, data: { name: "Arraste", email: "drag-" + touch + "@example.com", role: "personal", password: "senha-ficticia-12345" } });
    const exercise = await (await page.request.post(base + "/api/exercises", { headers, data: { name: "Agachamento", muscleGroup: "Pernas", category: "Força" } })).json();
    const template = await (await page.request.post(base + "/api/workout-templates", { headers, data: { name: "Arrastar", exercises: [1, 2, 3].map(load => ({ exerciseId: exercise.id, load })) } })).json();
    await page.goto(base + "/treinos-preparados");
    await page.getByRole("button", { name: "Editar treino preparado Arrastar", exact: true }).click();
    const handles = page.getByRole("button", { name: /^Arrastar exercício / });
    await handles.nth(2).scrollIntoViewIfNeeded();
    const from = (await handles.nth(2).boundingBox())!, to = (await handles.nth(0).boundingBox())!;
    const x = from.x + from.width / 2, y = from.y + from.height / 2, targetY = to.y + to.height / 2;
    if (touch) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      // Aguarda o limiar de 200ms do gesto de pressionar e segurar.
      await page.waitForTimeout(250);
      for (let step = 1; step <= 10; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (targetY - y) * step / 10 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, targetY, { steps: 12 }); await page.mouse.up();
    }
    await expect(page.getByText("Ordem salva.", { exact: true })).toBeVisible();
    const saved = (await (await page.request.get(base + "/api/workout-templates")).json())[0];
    expect(saved.exercises.map((item: { load: number }) => item.load)).toEqual([3, 1, 2]);
    expect(await page.getByRole("button", { name: /^Detalhes de / }).first().getAttribute("aria-expanded")).toBe("false");
    await page.screenshot({ path: "test-results/workout-editor-drag-" + (touch ? "touch" : "mouse") + ".png", fullPage: true });
    await context.close();
  }
});
