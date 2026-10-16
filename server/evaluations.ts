import { z } from "zod";
import { evaluationSchema } from "../shared/validation";
import type { Db } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const templateInclude = {
  questions: {
    orderBy: { position: "asc" as const },
    include: { options: { orderBy: { position: "asc" as const } } },
  },
};
export const evaluationInclude = {
  answers: true,
  template: { include: templateInclude },
};
export async function saveEvaluation(
  db: Db,
  studentId: string,
  input: unknown,
  id?: string,
  ownerId?: string,
) {
  const data = evaluationSchema.parse(input);
  return db.$transaction(async (tx) => {
    const template = await tx.evaluationTemplate.findUnique({
      where: { id: data.templateId },
      include: templateInclude,
    });
    if (
      !template ||
      (ownerId && template.ownerId !== "system" && template.ownerId !== ownerId)
    )
      throw new HttpError(404, "Modelo não encontrado");
    const previous = id
      ? await tx.evaluation.findFirst({ where: { id, studentId } })
      : null;
    if (id && !previous) throw new HttpError(404, "Avaliação não encontrada");
    if (previous?.status === "concluida")
      throw new HttpError(
        409,
        "Avaliações concluídas são preservadas. Crie uma nova avaliação.",
      );
    if (previous && previous.templateId !== data.templateId)
      throw new HttpError(409, "O modelo de um rascunho não pode ser alterado");
    if (
      new Set(data.answers.map((a) => a.questionId)).size !==
      data.answers.length
    )
      throw new HttpError(400, "Respostas duplicadas");
    for (const a of data.answers) {
      const q = template.questions.find((q) => q.id === a.questionId);
      if (!q) throw new HttpError(400, "Pergunta não pertence ao modelo");
      if (a.value.trim() === "") continue;
      if (q.type === "choice" && !q.options.some((o) => o.label === a.value))
        throw new HttpError(400, "Opção inválida");
      if (q.type === "number" || q.type === "scale") {
        const n = Number(a.value);
        if (
          !Number.isFinite(n) ||
          (q.min !== null && n < q.min) ||
          (q.max !== null && n > q.max)
        )
          throw new HttpError(400, "Resposta numérica fora dos limites");
      }
    }
    if (
      data.status === "concluida" &&
      template.questions.some(
        (q) =>
          q.required &&
          !data.answers.some((a) => a.questionId === q.id && a.value.trim()),
      )
    )
      throw new HttpError(
        400,
        "Responda todas as perguntas obrigatórias antes de concluir",
      );
    const program = data.programId
      ? await tx.program.findUnique({ where: { id: data.programId } })
      : null;
    if (
      data.programId &&
      (!program || (ownerId && program.ownerId !== ownerId))
    )
      throw new HttpError(400, "Programa não encontrado");
    const { answers, ...fields } = data;
    const payload = {
      ...fields,
      programSnapshot: program ? JSON.stringify(program) : "",
      answers: { create: answers },
    };
    const result = id
      ? await tx.evaluation.update({
          where: { id },
          data: { ...payload, answers: { deleteMany: {}, create: answers } },
          include: evaluationInclude,
        })
      : await tx.evaluation.create({
          data: { ...payload, studentId },
          include: evaluationInclude,
        });
    if (
      data.status === "concluida" &&
      !(await tx.evaluation.count({
        where: { studentId, status: "concluida", date: { gt: data.date } },
      }))
    ) {
      const next = new Date(`${data.date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + template.cycleDays);
      await tx.student.update({
        where: { id: studentId },
        data: { nextEvaluationDate: next.toISOString().slice(0, 10) },
      });
    }
    await tx.historyEntry.create({
      data: {
        studentId,
        action:
          data.status === "concluida"
            ? "Avaliação concluída"
            : "Rascunho salvo",
        detail: { evaluationId: result.id, cycle: data.cycle },
      },
    });
    return result;
  });
}
export type EvaluationInput = z.infer<typeof evaluationSchema>;
