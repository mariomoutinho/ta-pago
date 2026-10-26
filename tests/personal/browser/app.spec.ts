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
  await page.getByRole("button", { name: "Adicionar sem preset", exact: true }).click();
  await page.getByLabel("Série/repetições 1", { exact: true }).fill("4/10");
  await page.getByLabel("Carga 1", { exact: true }).fill("60");
  await page.getByLabel("Intervalo 1", { exact: true }).fill("90");
  await page.getByRole("button", { name: "Opções adicionais", exact: true }).click();
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
  await pupil.getByRole("button", { name: "Voltar aos treinos", exact: true }).click();
  await pupil.getByRole("button", { name: "Treino A", exact: true }).click();

  await pupil.getByRole("button", { name: "Detalhes de Supino de teste", exact: true }).click();
  await expect(
    pupil.getByText("Supino de teste", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    pupil.getByTitle("Vídeo: Supino de teste", { exact: true }),
  ).toBeVisible();
  await expect(pupil.getByText("4/10", { exact: true })).toBeVisible();
  await expect(pupil.getByText("60", { exact: true })).toBeVisible();
  await expect(
    pupil.getByText("90", { exact: true }),
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
  await expect(page.getByRole("button", { name: "Salvar treino", exact: true })).toBeVisible();
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
  await expect(page.getByText("Preset salvo.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar preset", exact: true }).click();
  await page.getByRole("button", { name: "Usar preset Base de teste", exact: true }).click();
  await expect(page.getByLabel("Série/repetições 2", { exact: true }).filter({ visible: true })).toHaveValue("3/15");
  await page.getByRole("button", { name: "Salvar prescrição", exact: true }).click();
  await expect(page.getByText("Prescrição salva.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/series-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Voltar aos treinos", exact: true }).click();
  await page.getByRole("button", { name: "Treino A", exact: true }).click();
  await page.getByRole("button", { name: "Detalhes de Supino de teste", exact: true }).click();
  await expect(page.getByLabel("Série/repetições 2", { exact: true }).filter({ visible: true })).toHaveValue("3/15");
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
  await page.getByRole("button", { name: "Voltar aos treinos", exact: true }).click();
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
  await page.getByRole("button", { name: "Adicionar sem preset", exact: true }).click();
  await page.getByLabel("Série/repetições 1", { exact: true }).fill("3/12");
  await page.getByRole("button", { name: "Confirmar prescrição", exact: true }).click();
  await page.getByRole("button", { name: "Salvar treino preparado", exact: true }).click();
  await expect(page.getByText("Treino preparado salvo.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Treino de força preparado", { exact: true })).toBeVisible();
  const templates = await (await page.request.get(base + "/api/workout-templates")).json();
  expect(templates).toHaveLength(1);
  expect(templates[0].exercises[0].series[0].sets).toBe(3);
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
  expect(plans[0].workouts[0].exercises[0].series[0].sets).toBe(3);
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
  await expect(page.getByRole("button", { name: "Confirmar séries", exact: true })).toHaveCount(2);
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

test("seleção em lote combina, arrasta e exclui na janela do aluno sem perder prescrições", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Personal Blocos", email: "bulk-browser@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const exercises = [];
  for (const name of ["Supino bloco", "Remada bloco", "Agachamento bloco", "Prancha bloco"]) exercises.push(await (await page.request.post(base + "/api/exercises", { headers, data: { name, muscleGroup: "Corpo inteiro", category: "Força" } })).json());
  const student = await (await page.request.post(base + "/api/students", { headers, data: { name: "Aluno Blocos", mainGoal: "Força", startDate: "2026-10-24" } })).json();
  const plan = await (await page.request.post(base + "/api/students/" + student.id + "/workout-plans", { headers, data: { title: "Plano Blocos", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-24", workouts: [{ name: "Treino Blocos", exercises: exercises.map((exercise, index) => ({ exerciseId: exercise.id, sets: 3, repetitions: "12", load: index + 10, notes: "Preservar " + index })) }] } })).json();
  await page.goto(base + "/alunos/" + student.id);
  await page.getByRole("button", { name: "Treinos", exact: true }).click();
  await page.getByRole("button", { name: "Abrir rotina Plano Blocos", exact: true }).click();
  const openWorkout = () => page.getByRole("button", { name: "Treino Blocos", exact: true }).click();
  await openWorkout();
  const select = (name: string) => page.getByRole("checkbox", { name: "Selecionar " + name, exact: true });
  await select("Supino bloco").check(); await select("Agachamento bloco").check();
  await expect(page.getByText("2 exercício(s) selecionado(s)", { exact: true })).toBeVisible();
  await page.route("**/api/workout-plans/" + plan.id, route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Falha simulada ao combinar" }) }));
  await page.getByRole("button", { name: "Combinar selecionados", exact: true }).click();
  await expect(page.getByText("Falha simulada ao combinar", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Detalhes de / })).toHaveCount(4);
  await expect(select("Supino bloco")).toBeChecked();
  await page.unroute("**/api/workout-plans/" + plan.id);
  await page.getByRole("button", { name: "Combinar selecionados", exact: true }).click();
  await expect(page.getByText("Exercícios combinados.", { exact: true })).toBeVisible();
  const getPlan = async () => (await (await page.request.get(base + "/api/students/" + student.id + "/workout-plans")).json())[0];
  let saved = await getPlan();
  let items = saved.workouts[0].exercises;
  expect(items.map((item: { load: number }) => item.load)).toEqual([10, 12, 11, 13]);
  expect(items[0].groupId).toBe(items[1].groupId);
  expect(items.map((item: { id: string }) => item.id)).toEqual([plan.workouts[0].exercises[0].id, plan.workouts[0].exercises[2].id, plan.workouts[0].exercises[1].id, plan.workouts[0].exercises[3].id]);
  const groupedTitle = "Supino bloco + Agachamento bloco";
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(select(groupedTitle)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  const handle = page.getByRole("button", { name: "Arrastar exercício group:" + items[0].groupId, exact: true });
  const destination = page.getByRole("button", { name: "Arrastar exercício " + items[3].id, exact: true });
  const from = (await handle.boundingBox())!, to = (await destination.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 20); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 20, { steps: 15 });
  await expect(page.locator('strong').filter({ hasText: groupedTitle })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText("Ordem salva.", { exact: true })).toBeVisible();
  items = (await getPlan()).workouts[0].exercises;
  expect(items.map((item: { load: number }) => item.load)).toEqual([11, 13, 10, 12]);
  await page.screenshot({ path: "test-results/bulk-combined-1280.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/bulk-combined-390.png", fullPage: true });
  await page.reload(); await page.getByRole("button", { name: "Treinos", exact: true }).click(); await page.getByRole("button", { name: "Abrir rotina Plano Blocos", exact: true }).click(); await openWorkout();
  await expect(select(groupedTitle)).toBeVisible();
  await select(groupedTitle).check(); await select("Remada bloco").check();
  await page.getByRole("button", { name: "Excluir selecionados", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect((await getPlan()).workouts[0].exercises).toHaveLength(4);
  await page.getByRole("button", { name: "Excluir selecionados", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Exercícios removidos deste treino.", { exact: true })).toBeVisible();
  saved = await getPlan(); expect(saved.workouts[0].exercises).toHaveLength(1); expect(saved.workouts[0].exercises[0].load).toBe(13);
  expect((await (await page.request.get(base + "/api/exercises")).json())).toHaveLength(4);
  await page.screenshot({ path: "test-results/bulk-window-1280.png", fullPage: true });
});

test("modelo permite combinar, separar e salvar seleções sem gravar grupos incompletos", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Personal Seleção", email: "bulk-template@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const exercise = await (await page.request.post(base + "/api/exercises", { headers, data: { name: "Exercício marcado", muscleGroup: "Pernas", category: "Força" } })).json();
  const created = await (await page.request.post(base + "/api/workout-templates", { headers, data: { name: "Modelo marcado", exercises: [1, 2, 3].map(load => ({ exerciseId: exercise.id, load })) } })).json();
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + "/treinos-preparados");
  const edit = () => page.getByRole("button", { name: "Editar treino preparado Modelo marcado", exact: true }).click();
  await edit();
  await page.getByRole("checkbox", { name: "Selecionar todos os exercícios", exact: true }).check();
  await page.getByRole("button", { name: "Combinar selecionados", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Detalhes de / })).toHaveCount(1);
  await page.getByRole("button", { name: "Salvar treino preparado", exact: true }).click();
  await expect(page.getByText("Treino preparado salvo.", { exact: true })).toBeVisible();
  let saved = (await (await page.request.get(base + "/api/workout-templates")).json()).find((item: { id: string }) => item.id === created.id);
  expect(new Set(saved.exercises.map((item: { groupId: string }) => item.groupId)).size).toBe(1);
  expect(saved.exercises[0].groupId).toBeTruthy();
  await edit();
  await page.getByRole("checkbox", { name: "Selecionar todos os exercícios", exact: true }).check();
  await page.getByRole("button", { name: "Separar selecionados", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Detalhes de / })).toHaveCount(3);
  const checkboxes = page.getByRole("checkbox", { name: "Selecionar Exercício marcado", exact: true });
  await checkboxes.nth(0).check(); await checkboxes.nth(2).check();
  await page.getByRole("button", { name: "Excluir selecionados", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar treino preparado", exact: true }).click();
  await expect(page.getByText("Treino preparado salvo.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar treino preparado", exact: true })).toHaveCount(0);
  saved = (await (await page.request.get(base + "/api/workout-templates")).json()).find((item: { id: string }) => item.id === created.id);
  expect(saved.exercises).toHaveLength(1); expect(saved.exercises[0].load).toBe(2); expect(saved.exercises[0].groupId).toBeNull();
});

test("telas do treino preservam navegação, gerenciam grupos e adicionam pela biblioteca", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Personal Gestão", email: "group-management@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const library = [];
  for (const name of ["Leg press", "Extensora", "Supino", "Remada"]) library.push(await (await page.request.post(base + "/api/exercises", { headers, data: { name, muscleGroup: "Corpo inteiro", category: "Força" } })).json());
  const student = await (await page.request.post(base + "/api/students", { headers, data: { name: "Aluno Gestão", mainGoal: "Força", startDate: "2026-10-24" } })).json();
  const created = await (await page.request.post(base + "/api/students/" + student.id + "/workout-plans", { headers, data: { title: "Rotina Gestão", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-24", workouts: [{ name: "Sessão Gestão", exercises: library.map((ex, index) => ({ exerciseId: ex.id, groupId: index < 3 ? "circuito" : null, sets: 3, repetitions: "12", load: index + 10, notes: "Nota " + index })) }] } })).json();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(base + "/alunos/" + student.id); await page.getByRole("button", { name: "Treinos", exact: true }).click(); await page.getByRole("button", { name: "Abrir rotina Rotina Gestão", exact: true }).click(); await page.getByRole("button", { name: "Sessão Gestão", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/alunos/" + student.id + "/treinos\\?rotina=" + created.id + "&treino=" + created.workouts[0].id));
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await page.goBack(); await expect(page.getByText("Visibilidade para o aluno", { exact: true })).toBeVisible();
  await page.goForward(); await page.reload();
  await expect(page.getByRole("button", { name: "Detalhes de Remada", exact: true })).toBeVisible();
  const detail = (name: string) => page.getByRole("button", { name: "Detalhes de " + name, exact: true });
  const actions = (name: string) => page.getByRole("button", { name: "Ações de " + name, exact: true });
  const selected = (name: string) => page.getByRole("checkbox", { name: "Selecionar " + name, exact: true });
  await selected("Remada").check(); await expect(page.getByRole("button", { name: "Adicionar exercício", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Combinar selecionados", exact: true })).toBeDisabled();
  await selected("Remada").uncheck(); await expect(page.getByRole("button", { name: "Adicionar exercício", exact: true })).toBeVisible();
  await detail("Leg press + Extensora + Supino").click();
  await selected("Extensora").check();
  const ids = created.workouts[0].exercises.map((item: { id: string }) => item.id);
  await page.getByRole("button", { name: "Arrastar exercício " + ids[2], exact: true }).scrollIntoViewIfNeeded();
  const from = (await page.getByRole("button", { name: "Arrastar exercício " + ids[2], exact: true }).boundingBox())!;
  const to = (await page.getByRole("button", { name: "Arrastar exercício " + ids[0], exact: true }).boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 20); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 20, { steps: 12 }); await page.mouse.up();
  await expect(page.getByText("Ordem salva.", { exact: true })).toBeVisible();
  await expect(selected("Extensora")).toBeChecked();
  const getPlan = async () => (await (await page.request.get(base + "/api/students/" + student.id + "/workout-plans")).json())[0];
  expect((await getPlan()).workouts[0].exercises.map((item: { id: string }) => item.id)).toEqual([ids[2], ids[0], ids[1], ids[3]]);
  await page.getByRole("button", { name: "Limpar seleção", exact: true }).click();
  await actions("Leg press").click(); await page.getByRole("button", { name: "Remover do grupo", exact: true }).click();
  await expect(detail("Supino + Extensora")).toBeVisible();
  await actions("Supino + Extensora").click(); await page.getByRole("button", { name: "Adicionar exercício existente ao grupo", exact: true }).click(); await page.getByRole("button", { name: "Remada", exact: true }).click();
  await expect(detail("Supino + Extensora + Remada")).toBeVisible();
  await actions("Leg press").click(); await page.getByRole("button", { name: "Duplicar exercício", exact: true }).click();
  await expect(detail("Leg press")).toHaveCount(2);
  let saved = await getPlan(); expect(saved.workouts[0].exercises).toHaveLength(5);
  expect(new Set(saved.workouts[0].exercises.map((item: { id: string }) => item.id)).size).toBe(5);
  expect(saved.workouts[0].exercises[4].notes).toBe("Nota 0");
  await actions("Leg press").last().click(); await page.getByRole("button", { name: "Editar exercício", exact: true }).click(); await page.getByRole("button", { name: "Opções adicionais", exact: true }).click(); await page.getByLabel("Observações da prescrição", { exact: true }).fill("Nota da cópia"); await page.getByRole("button", { name: "Confirmar prescrição", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar prescrição", exact: true })).toHaveCount(0);
  await actions("Supino + Extensora + Remada").click(); await page.getByRole("button", { name: "Adicionar novo exercício ao grupo", exact: true }).last().click();
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await expect(page.getByLabel("Nome do plano *", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Expandir exercício Leg press", exact: true }).click(); await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar sem preset", exact: true }).click(); await page.getByLabel("Série/repetições 1", { exact: true }).fill("2/15"); await page.getByRole("button", { name: "Confirmar prescrição", exact: true }).click(); await page.getByRole("button", { name: "Salvar plano", exact: true }).click();
  await expect(page.getByText("Plano salvo com sucesso.", { exact: true })).toBeVisible();
  saved = await getPlan(); expect(saved.workouts[0].exercises).toHaveLength(6);
  expect(saved.workouts[0].exercises.filter((item: { groupId: string }) => item.groupId === "circuito")).toHaveLength(4);
  expect(saved.workouts[0].exercises[3].series[0].sets).toBe(2);
  expect(saved.workouts[0].exercises[5].notes).toBe("Nota da cópia");
  await page.reload(); await page.getByRole("button", { name: "Treinos", exact: true }).click(); await page.getByRole("button", { name: "Abrir rotina Rotina Gestão", exact: true }).click(); await page.getByRole("button", { name: "Sessão Gestão", exact: true }).click();
  await expect(detail("Supino + Extensora + Remada + Leg press")).toBeVisible();
  await page.screenshot({ path: "test-results/editor-final-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: "test-results/editor-final-mobile.png", fullPage: true });
});

test("adicionar treino mostra somente a nova sessão e preserva a rotina", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Personal Sessão", email: "single-workout@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const student = await (await page.request.post(base + "/api/students", { headers, data: { name: "Aluno Sessão", mainGoal: "Força", startDate: "2026-10-26" } })).json();
  const endpoint = base + "/api/students/" + student.id + "/workout-plans";
  const original = await (await page.request.post(endpoint, { headers, data: { title: "Rotina preservada", objective: "Força", difficulty: "Iniciante", startsAt: "2026-10-26", instructions: "Manter orientações", workouts: [{ name: "Treino existente", exercises: [] }] } })).json();
  await page.goto(base + "/alunos/" + student.id + "/treinos?rotina=" + original.id);
  await page.getByRole("button", { name: "+ Adicionar treino", exact: true }).click();
  await expect(page.getByLabel("Nome do plano *", { exact: true })).toBeHidden();
  await expect(page.getByText("Treino existente", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Duplicar treino", exact: true }).last()).toBeHidden();
  await page.getByLabel("Nome do treino *", { exact: true }).filter({ visible: true }).fill("Nova sessão isolada");
  await page.getByLabel("Subtítulo", { exact: true }).filter({ visible: true }).fill("Novo subtítulo");
  await page.getByRole("button", { name: "Salvar treino", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ver exercícios", exact: true })).toHaveCount(2);
  const saved = (await (await page.request.get(endpoint)).json())[0];
  expect(saved.title).toBe(original.title);
  expect(saved.instructions).toBe(original.instructions);
  expect(saved.workouts[0]).toMatchObject({ id: original.workouts[0].id, name: "Treino existente" });
  expect(saved.workouts[1]).toMatchObject({ name: "Nova sessão isolada", subtitle: "Novo subtítulo" });
  await page.getByRole("button", { name: "+ Adicionar treino", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  expect((await (await page.request.get(endpoint)).json())[0].workouts).toHaveLength(2);
});

test("presets e séries por tipo preservam alongamento e campos configuráveis", async ({ page }) => {
  const headers = { "X-Requested-With": "TaPago" };
  await page.request.post(base + "/api/auth/register", { headers, data: { name: "Personal Tipos", email: "typed-series@example.com", role: "personal", password: "senha-ficticia-12345" } });
  const exercise = await (await page.request.post(base + "/api/exercises", { headers, data: { name: "Alongamento teste", muscleGroup: "Peitoral", category: "Alongamento" } })).json();
  const student = await (await page.request.post(base + "/api/students", { headers, data: { name: "Aluno Tipos", mainGoal: "Mobilidade", startDate: "2026-10-26" } })).json();
  const endpoint = base + "/api/students/" + student.id + "/workout-plans";
  const original = await (await page.request.post(endpoint, { headers, data: { title: "Rotina tipos", objective: "Mobilidade", difficulty: "Iniciante", startsAt: "2026-10-26", workouts: [{ name: "Treino tipos", exercises: [] }] } })).json();
  await page.goto(base + "/alunos/" + student.id + "/treinos?rotina=" + original.id);
  await page.getByRole("button", { name: "Treino tipos", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar exercício", exact: true }).click();
  await page.getByRole("button", { name: "Expandir exercício Alongamento teste", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await expect(page.getByText("Escolha um preset", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar sem preset", exact: true }).click();
  await expect(page.getByLabel("Carga 1", { exact: true })).toHaveCount(0);
  await page.getByLabel("Tempo 1", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Adicionar série", exact: true }).click();
  await page.getByRole("radio", { name: "Tipo da série: Corrida", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar tipo", exact: true }).click();
  await page.getByLabel("Distância 2", { exact: true }).fill("2.5");
  await page.getByLabel("Tempo 2", { exact: true }).fill("600");
  await page.getByLabel("Velocidade 2", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Salvar como preset", exact: true }).click();
  await page.getByLabel("Nome do preset", { exact: true }).fill("Mobilidade e corrida");
  await page.getByRole("button", { name: "Salvar preset", exact: true }).click();
  await expect(page.getByText("Preset salvo.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar prescrição", exact: true }).click();
  await page.getByRole("button", { name: "Salvar plano", exact: true }).click();
  await expect(page.getByText("Plano salvo com sucesso.", { exact: true })).toBeVisible();
  const saved = (await (await page.request.get(endpoint)).json())[0];
  expect(saved.workouts[0].exercises[0].series).toEqual([
    { type: "repetitions-time", sets: 1, repetitions: "1", load: null, restSeconds: null, durationSeconds: 20 },
    { type: "running", sets: 1, repetitions: "", load: null, restSeconds: null, durationSeconds: 600, distance: 2.5, speed: 15 },
  ]);
  await page.getByRole("button", { name: "Adicionar exercício", exact: true }).click();
  await page.getByRole("button", { name: "Expandir exercício Alongamento teste", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar ao treino", exact: true }).click();
  await page.getByLabel("Pesquise por nome", { exact: true }).fill("Mobilidade");
  await page.getByRole("button", { name: "Ver preset", exact: true }).click();
  await expect(page.getByText(/Distância \(km\): 2.5/)).toBeVisible();
  await page.getByRole("button", { name: "Usar preset Mobilidade e corrida", exact: true }).click();
  await expect(page.getByLabel("Tempo 1", { exact: true }).filter({ visible: true })).toHaveValue("20");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/series-types-mobile.png", fullPage: true });
});
