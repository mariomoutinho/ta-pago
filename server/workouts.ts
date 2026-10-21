import { Router } from "express";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import { exerciseSchema, planSchema } from "../shared/workouts";

export const planInclude = {
  workouts: {
    where: { deletedAt: null },
    orderBy: { orderIndex: "asc" as const },
    include: {
      exercises: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" as const },
        include: { exercise: true },
      },
    },
  },
};
export function workoutRoutes(db: Db) {
  const router = Router();
  router.get("/me/workout-plans", async (_req, res) => {
    if (res.locals.user.role !== "student")
      throw new HttpError(403, "Acesso do aluno");
    res.json(
      await db.workoutPlan.findMany({
        where: {
          student: { accountId: res.locals.user.id },
          publishedAt: { not: null },
          status: { in: ["ativo", "arquivado"] },
        },
        include: {
          ...planInclude,
          student: {
            select: { name: true, personal: { select: { name: true } } },
          },
        },
        orderBy: { startsAt: "desc" },
      }),
    );
  });
  // Aplicar o guard apenas às rotas deste módulo, sem interceptar as demais APIs.
  router.use(
    ["/exercises", "/workout-plans", "/students/:studentId/workout-plans"],
    (_req, res, next) => {
      if (res.locals.user.role !== "personal")
        throw new HttpError(403, "Acesso exclusivo do personal");
      next();
    },
  );
  router.get("/exercises", async (req, res) => {
    const query = (key: string) =>
      typeof req.query[key] === "string"
        ? String(req.query[key]).slice(0, 160)
        : "";
    res.json(
      await db.exercise.findMany({
        where: {
          ownerId: res.locals.user.id,
          ...(query("q") ? { name: { contains: query("q") } } : {}),
          ...(query("muscleGroup")
            ? { muscleGroup: query("muscleGroup") }
            : {}),
          ...(query("category") ? { category: query("category") } : {}),
        },
        orderBy: { name: "asc" },
      }),
    );
  });
  router.post("/exercises", async (req, res) => {
    res
      .status(201)
      .json(
        await db.exercise.create({
          data: {
            ...exerciseSchema.parse(req.body),
            ownerId: res.locals.user.id,
          },
        }),
      );
  });
  router.put("/exercises/:id", async (req, res) => {
    const data = exerciseSchema.parse(req.body);
    const result = await db.exercise.updateMany({
      where: { id: String(req.params.id), ownerId: res.locals.user.id },
      data,
    });
    if (!result.count) throw new HttpError(404, "Exercício não encontrado");
    res.json(
      await db.exercise.findUnique({ where: { id: String(req.params.id) } }),
    );
  });
  router.get("/students/:studentId/workout-plans", async (req, res) => {
    const studentId = String(req.params.studentId);
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        personalId: res.locals.user.id,
        linkStatus: { not: "ended" },
      },
    });
    if (!student) throw new HttpError(404, "Aluno não encontrado");
    res.json(
      await db.workoutPlan.findMany({
        where: { studentId },
        include: planInclude,
        orderBy: { startsAt: "desc" },
      }),
    );
  });
  async function save(
    body: unknown,
    ownerId: string,
    studentId?: string,
    id?: string,
  ) {
    const { workouts, revision, ...data } = planSchema.parse(body);
    return db.$transaction(async (tx) => {
      const existing = id
        ? await tx.workoutPlan.findFirst({
            where: {
              id,
              student: { personalId: ownerId, linkStatus: { not: "ended" } },
            },
            include: planInclude,
          })
        : null;
      if (id && !existing) throw new HttpError(404, "Plano não encontrado");
      const student = await tx.student.findFirst({
        where: {
          id: existing?.studentId ?? studentId,
          personalId: ownerId,
          linkStatus: { not: "ended" },
        },
      });
      if (!student) throw new HttpError(404, "Aluno não encontrado");
      if (existing && revision !== existing.revision)
        throw new HttpError(
          409,
          "Plano atualizado em outra sessão. Feche e abra novamente antes de editar.",
        );
      if (existing?.publishedAt && data.status === "rascunho")
        throw new HttpError(
          400,
          "Arquive um plano publicado para preservar o histórico",
        );
      for (const w of workouts) {
        const old = existing?.workouts.find((x) => x.id === w.id);
        if (w.id && !old) throw new HttpError(400, "Treino inválido");
        for (const e of w.exercises) {
          const previous = old?.exercises.find((x) => x.id === e.id);
          if (e.id && !previous)
            throw new HttpError(400, "Prescrição inválida");
          const exercise = await tx.exercise.findFirst({
            where: { id: e.exerciseId, ownerId },
          });
          if (
            !exercise ||
            (exercise.status !== "ativo" &&
              previous?.exerciseId !== exercise.id)
          )
            throw new HttpError(400, "Exercício indisponível");
        }
      }
      const publishedAt =
        existing?.publishedAt ?? (data.status === "ativo" ? new Date() : null);
      const plan = existing
        ? await tx.workoutPlan.update({
            where: { id: existing.id, revision },
            data: { ...data, publishedAt, revision: { increment: 1 } },
          })
        : await tx.workoutPlan.create({
            data: { ...data, studentId: student.id, publishedAt },
          });
      const now = new Date();
      // Remoções são lógicas; as relações e prescrições anteriores continuam íntegras.
      await tx.workout.updateMany({
        where: {
          planId: plan.id,
          deletedAt: null,
          id: { notIn: workouts.flatMap((w) => (w.id ? [w.id] : [])) },
        },
        data: { deletedAt: now },
      });
      for (const [orderIndex, w] of workouts.entries()) {
        const { id: workoutId, exercises, ...fields } = w;
        const workout = workoutId
          ? await tx.workout.update({
              where: { id: workoutId },
              data: { ...fields, orderIndex },
            })
          : await tx.workout.create({
              data: { ...fields, orderIndex, planId: plan.id },
            });
        await tx.workoutExercise.updateMany({
          where: {
            workoutId: workout.id,
            deletedAt: null,
            id: { notIn: exercises.flatMap((e) => (e.id ? [e.id] : [])) },
          },
          data: { deletedAt: now },
        });
        for (const [position, e] of exercises.entries()) {
          const { id: prescriptionId, ...fields } = e;
          if (prescriptionId)
            await tx.workoutExercise.update({
              where: { id: prescriptionId },
              data: { ...fields, orderIndex: position },
            });
          else
            await tx.workoutExercise.create({
              data: { ...fields, orderIndex: position, workoutId: workout.id },
            });
        }
      }
      return tx.workoutPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: planInclude,
      });
    });
  }
  router.post("/students/:studentId/workout-plans", async (req, res) => {
    res
      .status(201)
      .json(
        await save(req.body, res.locals.user.id, String(req.params.studentId)),
      );
  });
  router.put("/workout-plans/:id", async (req, res) => {
    res.json(
      await save(
        req.body,
        res.locals.user.id,
        undefined,
        String(req.params.id),
      ),
    );
  });
  return router;
}
