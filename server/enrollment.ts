import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { Db } from "./db";
import { newToken, sessionKey } from "./security";
import { HttpError } from "./evaluations";
import {
  enrollmentSchema,
  policyVersion,
  type EnrollmentInput,
} from "../shared/enrollment";
import { seal, unseal, emailFingerprint } from "./enrollment-crypto";
export function enrollmentOrigin() {
  const url = new URL(
    process.env.PERSONAL_ENROLLMENT_ORIGIN ?? "http://localhost:3003",
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Origem de cadastro inválida");
  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" ||
      /localhost|127\.0\.0\.1|\[::1\]/.test(url.hostname))
  )
    throw new Error("Produção requer origem pública HTTPS");
  return url.origin;
}
export function retentionDays() {
  const value = Number(process.env.PERSONAL_ENROLLMENT_RETENTION_DAYS ?? 90);
  if (!Number.isInteger(value) || value < 1 || value > 3650)
    throw new Error("Retenção deve estar entre 1 e 3650 dias");
  return value;
}
export async function purgeEnrollments(db: Db) {
  return db.$transaction(async (tx) => {
    const result = await tx.enrollmentRequest.deleteMany({
      where: {
        status: { in: ["pending", "rejected"] },
        updatedAt: { lt: new Date(Date.now() - retentionDays() * 86400000) },
      },
    });
    await tx.enrollmentChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result;
  });
}
const genericSuccess = {
  ok: true,
  message: "Cadastro enviado ao profissional. Aguarde o contato dele.",
};
export function publicEnrollmentRoutes(db: Db) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas tentativas. Tente novamente mais tarde." },
  });
  router.use(limiter);
  router.get("/:token", async (req, res) => {
    const link = await db.enrollmentLink.findUnique({
      where: { token: String(req.params.token) },
    });
    if (!link?.active)
      throw new HttpError(
        404,
        "Link indisponível. Peça um novo link ao personal.",
      );
    const challenge = newToken();
    await db.enrollmentChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await db.enrollmentChallenge.create({
      data: {
        id: sessionKey(challenge),
        linkId: link.id,
        expiresAt: new Date(Date.now() + 60 * 60000),
      },
    });
    res.json({
      personalName: link.publicName,
      contact: link.contact,
      policyVersion,
      retentionDays: retentionDays(),
      challenge,
    });
  });
  router.post("/:token", async (req, res) => {
    const parsed = enrollmentSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(
        400,
        "Confira os campos obrigatórios e os consentimentos.",
      );
    const challenge = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .safeParse(req.body.challenge);
    if (!challenge.success || req.body.website)
      throw new HttpError(
        400,
        "Não foi possível enviar. Reabra o formulário e tente novamente.",
      );
    const data = parsed.data;
    await db.$transaction(async (tx) => {
      const link = await tx.enrollmentLink.findUnique({
        where: { token: String(req.params.token) },
      });
      if (!link?.active)
        throw new HttpError(
          404,
          "Link indisponível. Peça um novo link ao personal.",
        );
      const proof = await tx.enrollmentChallenge.findUnique({
        where: { id: sessionKey(challenge.data) },
      });
      if (
        !proof ||
        proof.linkId !== link.id ||
        proof.expiresAt < new Date() ||
        Date.now() - proof.createdAt.getTime() < 2000
      )
        throw new HttpError(
          400,
          "Não foi possível enviar. Reabra o formulário e tente novamente.",
        );
      await tx.enrollmentChallenge.delete({ where: { id: proof.id } });
      const emailHash = emailFingerprint(data.email);
      if (
        await tx.enrollmentRequest.findUnique({
          where: {
            personalId_emailHash: { personalId: link.personalId, emailHash },
          },
        })
      )
        return;
      const { health, ...ordinary } = data;
      await tx.enrollmentRequest.create({
        data: {
          personalId: link.personalId,
          emailHash,
          payload: seal(ordinary),
          healthPayload: Object.values(health).some(Boolean)
            ? seal(health)
            : null,
          policyVersion,
          consentAt: new Date(),
          healthConsentAt: data.healthConsent ? new Date() : null,
          events: { create: { status: "pending" } },
        },
      });
    });
    res.status(202).json(genericSuccess);
  });
  return router;
}
export function privateEnrollmentRoutes(db: Db) {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.user.role !== "personal")
      throw new HttpError(403, "Acesso exclusivo do personal");
    next();
  });
  const owner = (res: any) => res.locals.user.id as string;
  router.get("/link", async (_req, res) => {
    const link = await db.enrollmentLink.findUnique({
      where: { personalId: owner(res) },
    });
    const origin = enrollmentOrigin();
    res.json(
      link
        ? {
            token: link.token,
            url: `${origin}/cadastro/${link.token}`,
            active: link.active,
            publicName: link.publicName,
            contact: link.contact,
            local: new URL(origin).protocol === "http:",
            received: await db.enrollmentRequest.count({
              where: { personalId: owner(res) },
            }),
          }
        : null,
    );
  });
  router.post("/link", async (req, res) => {
    const fields = z
      .object({
        publicName: z.string().trim().min(2).max(120),
        contact: z.string().trim().min(5).max(200),
      })
      .parse(req.body);
    enrollmentOrigin();
    const link = await db.$transaction(async (tx) => {
      const old = await tx.enrollmentLink.findUnique({
        where: { personalId: owner(res) },
      });
      if (old)
        await tx.enrollmentChallenge.deleteMany({ where: { linkId: old.id } });
      return tx.enrollmentLink.upsert({
        where: { personalId: owner(res) },
        create: { personalId: owner(res), token: newToken(), ...fields },
        update: { token: newToken(), active: true, ...fields },
      });
    });
    res.status(201).json({ ok: true });
  });
  router.delete("/link", async (_req, res) => {
    await db.enrollmentLink.updateMany({
      where: { personalId: owner(res) },
      data: { active: false },
    });
    res.json({ ok: true });
  });
  router.get("/requests", async (_req, res) => {
    await purgeEnrollments(db);
    const rows = await db.enrollmentRequest.findMany({
      where: { personalId: owner(res) },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      rows.map((row) => {
        const form = unseal<EnrollmentInput>(row.payload);
        return {
          id: row.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          goals: form.goals,
          status: row.status,
          createdAt: row.createdAt,
          studentId: row.studentId,
        };
      }),
    );
  });
  router.use("/requests/:id", async (req, res, next) => {
    const row = await db.enrollmentRequest.findFirst({
      where: { id: String(req.params.id), personalId: owner(res) },
    });
    if (!row) throw new HttpError(404, "Cadastro não encontrado");
    res.locals.enrollment = row;
    next();
  });
  router.get("/requests/:id", async (_req, res) => {
    const row = res.locals.enrollment;
    const form = unseal<EnrollmentInput>(row.payload);
    res.json({
      id: row.id,
      status: row.status,
      studentId: row.studentId,
      createdAt: row.createdAt,
      form: {
        ...form,
        health: row.healthPayload
          ? unseal(row.healthPayload)
          : { restrictions: "", injuries: "", adaptations: "" },
      },
      policyVersion: row.policyVersion,
      consentAt: row.consentAt,
      healthConsentAt: row.healthConsentAt,
      events: await db.enrollmentEvent.findMany({
        where: { requestId: row.id },
        orderBy: { createdAt: "asc" },
      }),
    });
  });
  router.post("/requests/:id/status", async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["active", "rejected", "inactive"]) })
      .parse(req.body);
    await db.$transaction(async (tx) => {
      const row = await tx.enrollmentRequest.findFirstOrThrow({
        where: { id: res.locals.enrollment.id, personalId: owner(res) },
      });
      if (row.status === status) return;
      if (!(
        (row.status === "pending" && ["active", "rejected"].includes(status)) ||
        (row.status === "active" && status === "inactive")
      ))
        throw new HttpError(409, "Transição de status não permitida");
      let studentId = row.studentId;
      if (status === "active") {
        const form = unseal<EnrollmentInput>(row.payload);
        const ids = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM Student WHERE personalId = ${owner(res)} AND lower(trim(email)) = ${form.email} LIMIT 2`;
        const matches = await tx.student.findMany({
          where: { id: { in: ids.map((x) => x.id) } },
        });
        if (matches.length > 1 || matches[0]?.linkStatus === "ended")
          throw new HttpError(
            409,
            "Revise o cadastro existente antes de aprovar",
          );
        let student = matches[0];
        if (!student)
          student = await tx.student.create({
            data: {
              personalId: owner(res),
              name: form.name,
              email: form.email,
              phone: form.phone,
              birthDate: form.birthDate || null,
              sex: form.gender,
              startDate: new Date().toISOString().slice(0, 10),
              mainGoal: form.goals.join(", "),
              secondaryGoals: form.specificGoals,
              experience: `${form.practicing}; ${form.daysPerWeek} dias/semana; ${form.experienceDuration}; personal anterior: ${form.previousTrainer}; modalidade: ${form.preferredActivity}`,
              availability: form.availability,
              weeklyFrequency: Math.max(1, form.daysPerWeek),
            },
          });
        studentId = student.id;
        await tx.historyEntry.create({
          data: {
            studentId,
            action: "Cadastro por link aprovado",
            detail: { requestId: row.id },
          },
        });
      }
      if (status === "inactive" && studentId) {
        await tx.student.update({
          where: { id: studentId },
          data: { linkStatus: "ended", status: "inativo" },
        });
        await tx.invitation.deleteMany({ where: { studentId } });
        await tx.historyEntry.create({
          data: {
            studentId,
            action: "Vínculo encerrado pelo personal",
            detail: {},
          },
        });
      }
      await tx.enrollmentRequest.update({
        where: { id: row.id },
        data: {
          status,
          studentId,
          ...(status === "inactive" ? { healthPayload: null } : {}),
          events: { create: { status } },
        },
      });
    });
    res.json({ ok: true });
  });
  router.delete("/requests/:id", async (_req, res) => {
    if (res.locals.enrollment.status === "active")
      throw new HttpError(409, "Desative o vínculo antes de excluir a ficha");
    await db.enrollmentRequest.delete({
      where: { id: res.locals.enrollment.id },
    });
    res.json({ ok: true });
  });
  return router;
}
