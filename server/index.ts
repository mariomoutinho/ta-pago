import { runtimeConfig } from "./runtime";
import { setInterval, clearInterval } from "node:timers";
import { purgeEnrollments } from "./enrollment";
import { mkdirSync } from "node:fs";
import { createDb } from "./db";
import { createApp } from "./app";
mkdirSync("data", { recursive: true });
const { port, host } = runtimeConfig();
const db = createDb();
const server = createApp(db).listen(port, host, () =>
  console.log(`Tá Pago Personal escutando em ${host}:${port}`),
);
let purging = false;
async function purge() {
  if (purging) return;
  purging = true;
  try {
    await purgeEnrollments(db);
  } catch {
    console.error("Não foi possível aplicar retenção de cadastros");
  } finally {
    purging = false;
  }
}
void purge();
const retentionTimer = setInterval(() => void purge(), 60 * 60 * 1000);
(retentionTimer as unknown as NodeJS.Timeout).unref();
async function close() {
  clearInterval(retentionTimer);
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
