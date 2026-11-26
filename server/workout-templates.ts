import { orderSchema, ordered } from "./workout-order";
import { validExerciseGroups } from "../shared/workout-groups";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import { workoutTemplateSchema, workoutFolderSchema, workoutFolderMoveSchema, copyPreparedWorkout } from "../shared/workouts";

export function workoutTemplateRoutes(db: Db) {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.user.role !== "personal") throw new HttpError(403, "Acesso exclusivo do personal");
    next();
  });
  router.get("/", async (_req, res) => {
    const ownerId = res.locals.user.id;
    const [templates, exercises] = await Promise.all([
      db.workoutTemplate.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } }),
      db.exercise.findMany({ where: { ownerId } }),
    ]);
    const library = new Map(exercises.map(exercise => [exercise.id, exercise]));
    res.json(templates.map(template => ({
      id: template.id,
      ...workoutTemplateSchema.parse(template),
      exercises: workoutTemplateSchema.parse(template).exercises.map(item => ({
        ...item, exercise: library.get(item.exerciseId), alternativeExercise: item.alternativeExerciseId ? library.get(item.alternativeExerciseId) : null,
      })),
    })));
  });
  router.get("/folders", async (_req, res) => {
    res.json(await db.workoutFolder.findMany({ where: { ownerId: res.locals.user.id }, orderBy: { name: "asc" } }));
  });
  router.post("/folders", async (req, res) => {
    res.status(201).json(await db.workoutFolder.create({ data: { ...workoutFolderSchema.parse(req.body), ownerId: res.locals.user.id } }));
  });
  router.put("/folders/:id", async (req, res) => {
    const result = await db.workoutFolder.updateMany({ where: { id: String(req.params.id), ownerId: res.locals.user.id }, data: workoutFolderSchema.parse(req.body) });
    if (!result.count) throw new HttpError(404, "Pasta não encontrada");
    res.json({ ok: true });
  });
  router.delete("/folders/:id", async (req, res) => {
    const result = await db.workoutFolder.deleteMany({ where: { id: String(req.params.id), ownerId: res.locals.user.id } });
    if (!result.count) throw new HttpError(404, "Pasta não encontrada");
    res.json({ ok: true });
  });
  router.put("/:id/folder", async (req, res) => {
    const { folderId, revision } = workoutFolderMoveSchema.parse(req.body);
    res.json(await db.$transaction(async tx => {
      const current = await tx.workoutTemplate.findFirst({ where: { id: String(req.params.id), ownerId: res.locals.user.id } });
      if (!current) throw new HttpError(404, "Treino não encontrado");
      if (folderId && !await tx.workoutFolder.findFirst({ where: { id: folderId, ownerId: res.locals.user.id } })) throw new HttpError(404, "Pasta não encontrada");
      if (current.revision !== revision) throw new HttpError(409, "Treino atualizado em outra sessão. Reabra o catálogo.");
      return tx.workoutTemplate.update({ where: { id: current.id, revision }, data: { folderId, revision: { increment: 1 } } });
    }));
  });
  router.post("/:id/duplicate", async (req, res) => {
    const template = await db.workoutTemplate.findFirst({ where: { id: String(req.params.id), ownerId: res.locals.user.id } });
    if (!template) throw new HttpError(404, "Treino não encontrado");
    const parsed = workoutTemplateSchema.parse(template);
    res.status(201).json(await save({ ...copyPreparedWorkout(parsed), name: template.name.slice(0, 152) + " (cópia)", folderId: template.folderId }, res.locals.user.id));
  });
  async function save(body: unknown, ownerId: string, id?: string) {
    const { revision, ...data } = workoutTemplateSchema.parse(body);
    return db.$transaction(async tx => {
      const existing = id ? await tx.workoutTemplate.findFirst({ where: { id, ownerId } }) : null;
      if (id && !existing) throw new HttpError(404, "Treino preparado não encontrado");
      if (data.folderId && !await tx.workoutFolder.findFirst({ where: { id: data.folderId, ownerId } })) throw new HttpError(404, "Pasta não encontrada");
      if (existing && revision !== existing.revision)
        throw new HttpError(409, "Treino atualizado em outra sessão. Feche e abra novamente antes de editar.");
      data.exercises = data.exercises.map(item => ({ ...item, clientId: item.clientId ?? randomUUID() }));
      if (new Set(data.exercises.map(item => item.clientId)).size !== data.exercises.length) throw new HttpError(400, "Itens duplicados");
      if (data.exercises.some(item => item.alternativeExerciseId === item.exerciseId)) throw new HttpError(400, "Alternativa inválida");
      const ids = [...new Set(data.exercises.flatMap(item => [item.exerciseId, ...(item.alternativeExerciseId ? [item.alternativeExerciseId] : [])]))];
      const count = await tx.exercise.count({ where: { id: { in: ids }, ownerId, status: "ativo" } });
      if (count !== ids.length) throw new HttpError(400, "Use somente exercícios ativos da sua biblioteca");
      return existing
        ? tx.workoutTemplate.update({ where: { id: existing.id, revision }, data: { ...data, revision: { increment: 1 } } })
        : tx.workoutTemplate.create({ data: { ...data, ownerId } });
    });
  }
  router.post("/", async (req, res) => {
    res.status(201).json(await save(req.body, res.locals.user.id));
  });
  router.put("/:id/order", async (req, res) => {
    const { revision, ids } = orderSchema.parse(req.body);
    const result = await db.$transaction(async tx => {
      const template = await tx.workoutTemplate.findFirst({ where: { id: String(req.params.id), ownerId: res.locals.user.id } });
      if (!template) throw new HttpError(404, "Treino preparado não encontrado");
      if (template.revision !== revision) throw new HttpError(409, "Treino atualizado em outra sessão. Abra novamente.");
      const exercises = ordered(workoutTemplateSchema.parse(template).exercises, ids, item => item.clientId);
      if (!validExerciseGroups(exercises)) throw new HttpError(400, "Mova o bloco combinado inteiro");
      await tx.workoutTemplate.update({ where: { id: template.id, revision }, data: { exercises, revision: { increment: 1 } } });
      return { revision: revision + 1 };
    });
    res.json(result);
  });
  router.put("/:id", async (req, res) => {
    res.json(await save(req.body, res.locals.user.id, String(req.params.id)));
  });
  router.delete("/:id", async (req, res) => {
    const result = await db.workoutTemplate.deleteMany({ where: { id: String(req.params.id), ownerId: res.locals.user.id } });
    if (!result.count) throw new HttpError(404, "Treino preparado não encontrado");
    res.json({ ok: true });
  });
  return router;
}
