import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "node:path";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.PERSONAL_DATABASE_URL
      ? `file:${path.resolve(process.env.PERSONAL_DATABASE_URL.replace(/^file:/, ""))}`
      : `file:${path.resolve("data/tapago.db")}`,
  },
});
