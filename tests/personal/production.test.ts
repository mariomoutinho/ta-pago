import { it, expect } from "vitest";
import { runtimeConfig } from "../../server/runtime";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
const production = {
  NODE_ENV: "production" as const,
  PERSONAL_ENROLLMENT_ORIGIN: "https://tapago.coletivopindorama.com.br",
  PERSONAL_ENROLLMENT_KEY: "ab".repeat(32),
  PERSONAL_DATABASE_URL: "file:/tmp/persistent-test/tapago.db",
};
it("usa PORT do provedor e mantém padrão local", () => {
  expect(runtimeConfig({})).toEqual({ port: 3003, host: "127.0.0.1" });
  expect(runtimeConfig({ ...production, PORT: "4500" })).toEqual({
    port: 4500,
    host: "0.0.0.0",
  });
});
it("recusa produção sem HTTPS, chave ou persistência fora da release", () => {
  expect(() =>
    runtimeConfig({
      ...production,
      PERSONAL_ENROLLMENT_ORIGIN: "http://localhost:3003",
    }),
  ).toThrow();
  expect(() =>
    runtimeConfig({ ...production, PERSONAL_ENROLLMENT_KEY: "" }),
  ).toThrow();
  expect(() =>
    runtimeConfig({
      ...production,
      PERSONAL_DATABASE_URL: "file:./data/tapago.db",
    }),
  ).toThrow();
  expect(() =>
    runtimeConfig({
      ...production,
      PERSONAL_DATABASE_URL: `file:${process.cwd()}/data/tapago.db`,
    }),
  ).toThrow();
  expect(() => runtimeConfig({ ...production, PORT: "invalid" })).toThrow();
});
it("inicia a entrada da hospedagem e verifica API, SPA e cookie Secure", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "tapago-production-"));
  const url = `file:${folder}/test.db`;
  writeFileSync(path.join(folder, "test.db"), "");
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  const child = spawn(process.execPath, ["hostinger.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...production,
      PERSONAL_DATABASE_URL: url,
      PORT: String(port),
      PERSONAL_API_HOST: "127.0.0.1",
    },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(base + "/api/health")).status;
          } catch {
            return 0;
          }
        },
        { timeout: 20000 },
      )
      .toBe(200);
    expect(await (await fetch(base + "/api/health")).json()).toEqual({
      status: "ok",
    });
    expect((await fetch(base + "/api/students")).status).toBe(401);
    expect((await fetch(base + "/cadastro/invalid")).status).toBe(200);
    const registration = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "TaPago",
      },
      body: JSON.stringify({
        name: "Teste Produção",
        email: "production@example.com",
        password: "somente-teste-123456",
        role: "personal",
      }),
    });
    expect(registration.status).toBe(201);
    expect(registration.headers.get("set-cookie")).toContain("Secure");
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((r) => {
      if (child.exitCode !== null) r();
      else child.once("exit", () => r());
    });
    rmSync(folder, { recursive: true, force: true });
  }
}, 60000);
