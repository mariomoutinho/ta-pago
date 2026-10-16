import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createDb, type Db } from "./db";
import { Prisma } from "./generated/prisma/client";
const tables = [
  "User",
  "Program",
  "Student",
  "EvaluationTemplate",
  "EvaluationQuestion",
  "EvaluationOption",
  "Evaluation",
  "EvaluationAnswer",
  "TrackingRecord",
  "HistoryEntry",
] as const;
type Row = Record<string, unknown>;
const date = (value: unknown) =>
  value instanceof Date ? value : new Date(value as string | number);
const json = (value: unknown): Prisma.InputJsonValue =>
  typeof value === "string"
    ? JSON.parse(value)
    : JSON.parse(Buffer.from(value as Uint8Array).toString());
// Importação somente para destino sem dados de negócio, sem copiar sessões.
export async function importCompasso(db: Db, sourcePath: string) {
  const source = new DatabaseSync(path.resolve(sourcePath), { readOnly: true });
  const rows: Record<string, Row[]> = {};
  try {
    source.exec("BEGIN");
    for (const table of tables)
      rows[table] = source.prepare(`SELECT * FROM "${table}"`).all() as Row[];
    source.exec("COMMIT");
  } finally {
    source.close();
  }
  if (rows.User.length !== 1)
    throw new Error("A origem deve conter exatamente uma conta de personal.");
  const ownerId = String(rows.User[0].id);
  await db.$transaction(
    async (tx) => {
      if (
        (await tx.user.count()) ||
        (await tx.student.count()) ||
        (await tx.program.count())
      )
        throw new Error(
          "O destino já possui dados. Importação cancelada para evitar sobrescrita.",
        );
      const u = rows.User[0];
      await tx.user.create({
        data: {
          id: ownerId,
          name: String(u.name),
          email: String(u.email),
          passwordHash: String(u.passwordHash),
          role: "personal",
        },
      });
      for (const p of rows.Program)
        await tx.program.create({
          data: {
            id: String(p.id),
            ownerId,
            name: String(p.name),
            description: String(p.description),
            weeklyFrequency: Number(p.weeklyFrequency),
            cycleDays: Number(p.cycleDays),
            sessions: String(p.sessions),
            createdAt: date(p.createdAt),
          },
        });
      for (const t of rows.EvaluationTemplate)
        await tx.evaluationTemplate.create({
          data: {
            id: String(t.id),
            name: String(t.name),
            version: Number(t.version),
            cycleDays: Number(t.cycleDays),
            ownerId,
            createdAt: date(t.createdAt),
            questions: {
              create: rows.EvaluationQuestion.filter(
                (q) => q.templateId === t.id,
              ).map((q) => ({
                id: String(q.id),
                position: Number(q.position),
                dimension: String(q.dimension),
                text: String(q.text),
                type: String(q.type),
                required: Boolean(q.required),
                min: q.min === null ? null : Number(q.min),
                max: q.max === null ? null : Number(q.max),
                options: {
                  create: rows.EvaluationOption.filter(
                    (o) => o.questionId === q.id,
                  ).map((o) => ({
                    id: String(o.id),
                    position: Number(o.position),
                    label: String(o.label),
                  })),
                },
              })),
            },
          },
        });
      for (const s of rows.Student) {
        const { createdAt, updatedAt, ...fields } = s;
        await tx.student.create({
          data: {
            ...fields,
            personalId: ownerId,
            accountId: null,
            linkStatus: "unlinked",
            createdAt: date(createdAt),
            updatedAt: date(updatedAt),
          } as Prisma.StudentUncheckedCreateInput,
        });
      }
      for (const e of rows.Evaluation) {
        const { createdAt, updatedAt, ...fields } = e;
        await tx.evaluation.create({
          data: {
            ...fields,
            createdAt: date(createdAt),
            updatedAt: date(updatedAt),
          } as Prisma.EvaluationUncheckedCreateInput,
        });
      }
      for (const a of rows.EvaluationAnswer)
        await tx.evaluationAnswer.create({
          data: a as Prisma.EvaluationAnswerUncheckedCreateInput,
        });
      for (const r of rows.TrackingRecord)
        await tx.trackingRecord.create({
          data: {
            id: String(r.id),
            studentId: String(r.studentId),
            kind: String(r.kind),
            date: String(r.date),
            data: json(r.data),
            createdAt: date(r.createdAt),
            updatedAt: date(r.updatedAt),
          },
        });
      for (const h of rows.HistoryEntry)
        await tx.historyEntry.create({
          data: {
            id: String(h.id),
            studentId: String(h.studentId),
            action: String(h.action),
            detail: json(h.detail),
            createdAt: date(h.createdAt),
          },
        });
    },
    { timeout: 30000 },
  );
  return {
    users: rows.User.length,
    students: rows.Student.length,
    evaluations: rows.Evaluation.length,
    records: rows.TrackingRecord.length,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const flag = process.argv.indexOf("--source");
  if (flag < 0 || !process.argv[flag + 1])
    throw new Error(
      "Uso: npm run personal:import -- --source /caminho/compasso.db",
    );
  const db = createDb();
  try {
    console.log(
      "Importação concluída:",
      await importCompasso(db, process.argv[flag + 1]),
    );
  } finally {
    await db.$disconnect();
  }
}
