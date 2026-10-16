import "dotenv/config";
import { mkdirSync, closeSync, openSync, chmodSync } from "node:fs";
import path from "node:path";
const url = process.env.PERSONAL_DATABASE_URL ?? "file:./data/tapago.db";
if (!url.startsWith("file:"))
  throw new Error("O banco local requer PERSONAL_DATABASE_URL=file:caminho");
const file = path.resolve(url.slice(5));
mkdirSync(path.dirname(file), { recursive: true });
closeSync(openSync(file, "a", 0o600));
chmodSync(file, 0o600);
