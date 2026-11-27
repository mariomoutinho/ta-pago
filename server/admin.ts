import { Router } from "express";
import { z } from "zod";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import type { AdminProfile } from "../shared/admin";
import { adminPasswordSchema, adminTeacherSchema, adminDeleteSchema } from '../shared/admin';
import { hashPassword } from './security';
export function adminRoutes(db: Db, adminIds: readonly string[]) {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.user.role !== "personal" || !adminIds.includes(res.locals.user.id)) throw new HttpError(403, "Acesso exclusivo do administrador");
    next();
  });
  router.get("/profiles", async (req, res) => {
    const query = z.object({ q: z.string().trim().max(160).default(""), role: z.enum(["all", "personal", "student"]).default("all"), page: z.coerce.number().int().min(1).max(100000).default(1) }).parse(req.query);
    const [users, students] = await Promise.all([
      db.user.findMany({ where: { role: { in: ["personal", "student"] } }, select: { id: true, name: true, email: true, role: true } }),
      db.student.findMany({ select: { id: true, name: true, email: true, accountId: true, personal: { select: { name: true } } } }),
    ]);
    const profiles: AdminProfile[] = users.map(user => ({ id: "account:" + user.id, name: user.name, email: user.email, role: user.role as "personal" | "student", hasLogin: true, isAdmin: user.role === "personal" && adminIds.includes(user.id), teachers: [...new Set(students.filter(s => s.accountId === user.id).map(s => s.personal.name))] }));
    for (const student of students.filter(s => !s.accountId)) profiles.push({ id: "student:" + student.id, name: student.name, email: student.email, role: "student", hasLogin: false, isAdmin: false, teachers: [student.personal.name] });
    const counts = { personal: profiles.filter(p => p.role === "personal").length, student: profiles.filter(p => p.role === "student").length, withoutLogin: profiles.filter(p => !p.hasLogin).length };
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filtered = profiles.filter(profile => (query.role === "all" || profile.role === query.role) && normalize(profile.name + " " + profile.email).includes(normalize(query.q))).sort((a,b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id));
    res.json({ items: filtered.slice((query.page - 1) * 25, query.page * 25), total: filtered.length, page: query.page, pageSize: 25, counts });
  });
  router.post('/teachers', async (req, res) => {
    const { password, ...fields } = adminTeacherSchema.parse(req.body);
    const user = await db.user.create({ data: { ...fields, role: 'personal', professionalAuthorized: true, passwordHash: await hashPassword(password) }, select: { id: true, name: true, email: true, role: true } });
    res.status(201).json(user);
  });
  router.put('/profiles/:id/password', async (req, res) => {
    const { password } = adminPasswordSchema.parse(req.body);
    const id = String(req.params.id);
    if (!id.startsWith('account:')) throw new HttpError(409, 'Este cadastro ainda não possui conta com login.');
    const passwordHash = await hashPassword(password);
    await db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: id.slice(8) } });
      if (!user) throw new HttpError(404, 'Conta não encontrada');
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    res.json({ ok: true });
  });
  router.delete('/profiles/:id', async (req, res) => {
    adminDeleteSchema.parse(req.body);
    const id = String(req.params.id);
    await db.$transaction(async tx => {
      if (id.startsWith('account:')) {
        const user = await tx.user.findUnique({ where: { id: id.slice(8) } });
        if (!user) throw new HttpError(404, 'Conta não encontrada');
        if (user.role !== 'student') throw new HttpError(403, 'Somente alunos podem ser excluídos por esta ação.');
        await tx.student.deleteMany({ where: { accountId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      } else if (id.startsWith('student:')) {
        const student = await tx.student.findUnique({ where: { id: id.slice(8) } });
        if (!student) throw new HttpError(404, 'Aluno não encontrado');
        if (student.accountId) throw new HttpError(409, 'O aluno já possui login. Atualize a lista e exclua pela conta.');
        await tx.student.delete({ where: { id: student.id } });
      } else throw new HttpError(400, 'Perfil inválido');
    });
    res.json({ ok: true });
  });
  return router;
}
