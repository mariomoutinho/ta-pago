import { Router } from "express";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import { programRoutineSchema } from "../shared/programs";
import { workoutSchema } from "../shared/workouts";

export function programRoutes(db: Db) {
  const router = Router();
  router.get("/", async (_req, res) => {
    const ownerId = res.locals.user.id;
    const [programs, exercises] = await Promise.all([
      db.program.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
      db.exercise.findMany({ where: { ownerId } }),
    ]);
    const library = new Map(exercises.map(exercise => [exercise.id, exercise]));
    res.json(programs.map(program => ({ ...program, workouts: workoutSchema.array().parse(program.workouts).map(workout => ({ ...workout,
      exercises: workout.exercises.map(item => ({ ...item, exercise: library.get(item.exerciseId), alternativeExercise: item.alternativeExerciseId ? library.get(item.alternativeExerciseId) : null })),
    })) })));
  });
  async function save(body: unknown, ownerId: string, id?: string) {
    const { revision, workouts, ...data } = programRoutineSchema.parse(body);
    return db.$transaction(async tx => {
      const existing = id ? await tx.program.findFirst({ where: { id, ownerId } }) : null;
      if (id && !existing) throw new HttpError(404, "Rotina não encontrada");
      if (existing && revision !== undefined && revision !== existing.revision)
        throw new HttpError(409, "Rotina atualizada em outra sessão. Abra novamente antes de editar.");
      if (existing && workouts !== undefined && revision === undefined)
        throw new HttpError(409, "Abra novamente a rotina antes de alterar os treinos.");
      if (workouts !== undefined) {
        const ids = [...new Set(workouts.flatMap(w => w.exercises.flatMap(e => [e.exerciseId, ...(e.alternativeExerciseId ? [e.alternativeExerciseId] : [])])))];
        if (workouts.some(w => w.exercises.some(e => e.exerciseId === e.alternativeExerciseId))) throw new HttpError(400, "Alternativa inválida");
        if (await tx.exercise.count({ where: { id: { in: ids }, ownerId, status: "ativo" } }) !== ids.length)
          throw new HttpError(400, "Use somente exercícios ativos da sua biblioteca");
      }
      return existing ? tx.program.update({ where: { id: existing.id, revision: existing.revision }, data: { ...data, ...(workouts !== undefined ? { workouts } : {}), revision: { increment: 1 } } })
        : tx.program.create({ data: { ...data, workouts: workouts ?? [], ownerId } });
    });
  }
  router.post("/", async (req, res) => { res.status(201).json(await save(req.body, res.locals.user.id)); });
  router.put("/:id", async (req, res) => { res.json(await save(req.body, res.locals.user.id, String(req.params.id))); });
  router.delete("/:id", async (req, res) => {
    const id = String(req.params.id), ownerId = res.locals.user.id;
    await db.$transaction(async tx => {
      if (!await tx.program.findFirst({ where: { id, ownerId } })) throw new HttpError(404, "Rotina não encontrada");
      if (await tx.student.count({ where: { programId: id } })) throw new HttpError(409, "Remova a rotina dos alunos antes de excluí-la");
      await tx.program.delete({ where: { id } });
    });
    res.json({ ok: true });
  });
  return router;
}
