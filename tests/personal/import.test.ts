import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDb } from "../../server/db";
import { importCompasso } from "../../server/import-compasso";
it("importa sem alterar a origem e recusa sobrescrever o destino", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "tapago-import-")),
    sourcePath = path.join(folder, "source.db"),
    target = path.join(folder, "target.db");
  const source = new DatabaseSync(sourcePath);
  source.exec(
    readFileSync(
      "prisma/migrations/20261015191618_initial/migration.sql",
      "utf8",
    ),
  );
  source
    .prepare("INSERT INTO User VALUES (?,?,?,?)")
    .run("owner", "Personal teste", "import@example.com", "hash-ficticio");
  source
    .prepare(
      "INSERT INTO Student (id,name,startDate,mainGoal,updatedAt) VALUES (?,?,?,?,?)",
    )
    .run("student", "Aluno teste", "2026-01-01", "Força", Date.now());
  source.close();
  const before = readFileSync(sourcePath);
  writeFileSync(target, "");
  const url = `file:${target}`;
  execFileSync(
    path.resolve("node_modules/.bin/prisma"),
    ["migrate", "deploy"],
    { env: { ...process.env, PERSONAL_DATABASE_URL: url }, stdio: "pipe" },
  );
  const db = createDb(url);
  try {
    expect(await importCompasso(db, sourcePath)).toEqual({
      users: 1,
      students: 1,
      evaluations: 0,
      records: 0,
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: "owner" } }))
        .passwordHash,
    ).toBe("hash-ficticio");
    expect(
      (await db.student.findUniqueOrThrow({ where: { id: "student" } }))
        .personalId,
    ).toBe("owner");
    await expect(importCompasso(db, sourcePath)).rejects.toThrow(
      "já possui dados",
    );
    expect(await db.student.count()).toBe(1);
    expect(readFileSync(sourcePath)).toEqual(before);
  } finally {
    await db.$disconnect();
    rmSync(folder, { recursive: true, force: true });
  }
}, 60000);
