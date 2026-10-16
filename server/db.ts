import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
export function createDb(
  url = process.env.PERSONAL_DATABASE_URL ?? "file:./data/tapago.db",
) {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
export type Db = ReturnType<typeof createDb>;
