import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { z } from "zod";
import {
  programSchema,
  recordSchema,
  recordSchemas,
  studentSchema,
  templateSchema,
} from "../shared/validation";
import type { Db } from "./db";
import {
  enrollmentOrigin,
  privateEnrollmentRoutes,
  publicEnrollmentRoutes,
} from "./enrollment";
import {
  evaluationInclude,
  HttpError,
  saveEvaluation,
  templateInclude,
} from "./evaluations";
import { hashPassword, newToken, sessionKey, verifyPassword } from "./security";
import { workoutTemplateRoutes } from "./workout-templates";
import { planInclude, workoutRoutes } from "./workouts";

type Identity = { id: string; name: string; email: string; role: string };
const identity = (res: express.Response) => res.locals.user as Identity;
const studentInclude = {
  program: true,
  evaluations: {
    include: evaluationInclude,
    orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }],
  },
  records: {
    orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }],
  },
  history: { orderBy: { createdAt: "desc" as const } },
};
export function createApp(db: Db) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.PERSONAL_TRUST_PROXY)
    app.set(
      "trust proxy",
      process.env.PERSONAL_TRUST_PROXY.split(",").map((value) => value.trim()),
    );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "'unsafe-inline'"],
          "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
          "img-src": ["'self'", "data:", "https:", "http:"],
          "media-src": ["'self'", "https:", "http:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  const origins = (
    process.env.PERSONAL_APP_ORIGINS ??
    "http://127.0.0.1:8081,http://localhost:8081,http://127.0.0.1:3003,http://localhost:3003"
  ).split(",");
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const origin = req.get("Origin");
    if (origin && ![...origins, enrollmentOrigin()].includes(origin))
      throw new HttpError(403, "Origem não autorizada");
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.vary("Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Requested-With, Authorization, X-Client-Platform",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.sendStatus(204);
      return;
    }
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.get("X-Requested-With") !== "TaPago"
    )
      throw new HttpError(403, "Requisição inválida");
    next();
  });
  const cookie = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
  };
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas tentativas. Aguarde 15 minutos." },
  });
  const authSchema = z.object({
    email: z.email().transform((v) => v.toLowerCase()),
    password: z.string().min(12, "Use pelo menos 12 caracteres").max(128),
  });
  const publicUser = (u: Identity) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  });
  const tokenFrom = (req: express.Request) =>
    req.get("Authorization")?.replace(/^Bearer /, "") ??
    req.cookies.tapago_session;
  async function sessionUser(req: express.Request) {
    const token = tokenFrom(req);
    if (typeof token !== "string") return null;
    const session = await db.session.findUnique({
      where: { id: sessionKey(token) },
      include: { user: true },
    });
    return session && session.expiresAt > new Date() ? session.user : null;
  }
  async function establish(
    req: express.Request,
    res: express.Response,
    user: Identity,
    status = 200,
  ) {
    const token = newToken();
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.session.create({
      data: {
        id: sessionKey(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + cookie.maxAge),
      },
    });
    res
      .cookie("tapago_session", token, cookie)
      .status(status)
      .json({
        user: publicUser(user),
        ...(req.get("X-Client-Platform") === "native" ? { token } : {}),
      });
  }
  app.get("/api/auth/status", async (req, res) => {
    const user = await sessionUser(req);
    res.json({ user: user ? publicUser(user) : null });
  });
  app.post("/api/auth/register", limit, async (req, res) => {
    const data = authSchema
      .extend({
        name: z.string().trim().min(2).max(120),
        role: z.enum(["personal", "student"]),
      })
      .parse(req.body);
    const { password, ...fields } = data;
    const user = await db.user.create({
      data: { ...fields, passwordHash: await hashPassword(password) },
    });
    await establish(req, res, user, 201);
  });
  app.post("/api/auth/login", limit, async (req, res) => {
    const data = authSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user || !(await verifyPassword(data.password, user.passwordHash)))
      throw new HttpError(401, "E-mail ou senha inválidos");
    await establish(req, res, user);
  });
  app.get("/api/health", async (_req, res) => {
    try {
      await db.user.count();
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.use("/api/public/enrollment", publicEnrollmentRoutes(db));
  app.use("/api", async (req, res, next) => {
    const user = await sessionUser(req);
    if (!user) throw new HttpError(401, "Entre na sua conta para continuar");
    res.locals.user = publicUser(user);
    next();
  });

  app.use("/api/enrollment", privateEnrollmentRoutes(db));
  app.use("/api", workoutRoutes(db));
  app.use("/api/workout-templates", workoutTemplateRoutes(db));

  app.post("/api/auth/logout", async (req, res) => {
    await db.session.deleteMany({ where: { id: sessionKey(tokenFrom(req)) } });
    res
      .clearCookie("tapago_session", { ...cookie, maxAge: undefined })
      .json({ ok: true });
  });
  // A mesma identidade do aluno pode aceitar vínculos com diferentes profissionais.
  app.post("/api/me/claim", limit, async (req, res) => {
    const user = identity(res);
    if (user.role !== "student")
      throw new HttpError(403, "Entre com uma conta de aluno");
    const { code } = z
      .object({ code: z.string().trim().min(20).max(128) })
      .parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const invite = await tx.invitation.findUnique({
        where: { tokenHash: sessionKey(code) },
        include: { student: true },
      });
      if (
        !invite ||
        invite.consumedAt ||
        invite.expiresAt < new Date() ||
        invite.student.linkStatus === "ended"
      )
        throw new HttpError(400, "Convite inválido ou expirado");
      const enrollment = await tx.enrollmentRequest.findUnique({
        where: { studentId: invite.studentId },
      });
      if (
        enrollment &&
        (enrollment.status !== "active" ||
          invite.student.email.toLowerCase() !== user.email.toLowerCase())
      )
        throw new HttpError(
          403,
          "Use a conta do titular indicado no cadastro e um convite do personal",
        );
      if (invite.student.accountId && invite.student.accountId !== user.id)
        throw new HttpError(409, "Este cadastro já possui um vínculo");
      await tx.invitation.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      });
      const s = await tx.student.update({
        where: { id: invite.studentId },
        data: { accountId: user.id, linkStatus: "active" },
      });
      await tx.historyEntry.create({
        data: {
          studentId: s.id,
          action: "Vínculo aceito pelo aluno",
          detail: {},
        },
      });
      return { id: s.id };
    });
    res.json(result);
  });
  app.get("/api/me/students", async (_req, res) => {
    res.json(
      await db.student.findMany({
        where: { accountId: identity(res).id },
        select: {
          id: true,
          name: true,
          mainGoal: true,
          linkStatus: true,
          personal: { select: { name: true } },
          startDate: true,
        },
      }),
    );
  });
  app.use("/api/me/students/:id", async (req, res, next) => {
    const s = await db.student.findFirst({
      where: { id: String(req.params.id), accountId: identity(res).id },
    });
    if (!s) throw new HttpError(404, "Acompanhamento não encontrado");
    res.locals.student = s;
    next();
  });
  app.get("/api/me/students/:id", async (req, res) => {
    res.json(
      await db.student.findUnique({
        where: { id: String(req.params.id) },
        include: { ...studentInclude, personal: { select: { name: true } } },
      }),
    );
  });
  app.get("/api/me/students/:id/export", async (req, res) => {
    const s = await db.student.findUnique({
      where: { id: String(req.params.id) },
      include: {
        ...studentInclude,
        workoutPlans: {
          where: {
            publishedAt: { not: null },
            status: { in: ["ativo", "arquivado"] },
          },
          include: planInclude,
        },
      },
    });
    res.attachment(`tapago-${req.params.id}.json`).json({
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      student: s,
    });
  });
  app.post("/api/me/students/:id/revoke", async (req, res) => {
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: String(req.params.id) },
        data: { linkStatus: "ended" },
      });
      const registration = await tx.enrollmentRequest.findUnique({
        where: { studentId: String(req.params.id) },
      });
      if (registration)
        await tx.enrollmentRequest.update({
          where: { id: registration.id },
          data: {
            status: "inactive",
            healthPayload: null,
            events: { create: { status: "inactive" } },
          },
        });
      await tx.invitation.deleteMany({
        where: { studentId: String(req.params.id) },
      });
      await tx.historyEntry.create({
        data: {
          studentId: String(req.params.id),
          action: "Vínculo encerrado pelo aluno",
          detail: {},
        },
      });
    });
    res.json({ ok: true });
  });
  app.delete("/api/me/students/:id", async (req, res) => {
    await db.student.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
  app.put(
    "/api/me/students/:id/evaluations/:evaluationId",
    async (req, res) => {
      const student = res.locals.student;
      if (student.linkStatus !== "active")
        throw new HttpError(403, "Vínculo encerrado");
      const e = await db.evaluation.findFirst({
        where: { id: String(req.params.evaluationId), studentId: student.id },
      });
      if (!e) throw new HttpError(404, "Avaliação não encontrada");
      const { answers } = z
        .object({
          answers: z
            .array(
              z.object({
                questionId: z.string(),
                value: z.string().max(10000),
              }),
            )
            .max(100),
        })
        .parse(req.body);
      res.json(
        await saveEvaluation(
          db,
          student.id,
          { ...e, answers },
          e.id,
          student.personalId,
        ),
      );
    },
  );
  // Todas as rotas profissionais abaixo exigem papel e propriedade no servidor.
  app.use("/api", (_req, res, next) => {
    if (identity(res).role !== "personal")
      throw new HttpError(403, "Acesso exclusivo do personal");
    next();
  });
  app.get("/api/programs", async (_req, res) =>
    res.json(
      await db.program.findMany({
        where: { ownerId: identity(res).id },
        orderBy: { createdAt: "desc" },
      }),
    ),
  );
  app.post("/api/programs", async (req, res) =>
    res.status(201).json(
      await db.program.create({
        data: { ...programSchema.parse(req.body), ownerId: identity(res).id },
      }),
    ),
  );
  app.use("/api/programs/:id", async (req, res, next) => {
    if (
      !(await db.program.findFirst({
        where: { id: String(req.params.id), ownerId: identity(res).id },
      }))
    )
      throw new HttpError(404, "Programa não encontrado");
    next();
  });
  app.put("/api/programs/:id", async (req, res) =>
    res.json(
      await db.program.update({
        where: { id: String(req.params.id) },
        data: programSchema.parse(req.body),
      }),
    ),
  );
  app.delete("/api/programs/:id", async (req, res) => {
    if (await db.student.count({ where: { programId: String(req.params.id) } }))
      throw new HttpError(
        409,
        "Remova o programa dos alunos antes de excluí-lo",
      );
    await db.program.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
  app.get("/api/templates", async (_req, res) =>
    res.json(
      await db.evaluationTemplate.findMany({
        where: { ownerId: { in: ["system", identity(res).id] } },
        include: templateInclude,
        orderBy: [{ name: "asc" }, { version: "desc" }],
      }),
    ),
  );
  app.post("/api/templates", async (req, res) => {
    const data = templateSchema.parse(req.body);
    const ownerId = identity(res).id;
    const result = await db.$transaction(async (tx) => {
      const last = await tx.evaluationTemplate.findFirst({
        where: { name: data.name, ownerId: { in: ["system", ownerId] } },
        orderBy: { version: "desc" },
      });
      return tx.evaluationTemplate.create({
        data: {
          name: data.name,
          cycleDays: data.cycleDays,
          ownerId,
          version: (last?.version ?? 0) + 1,
          questions: {
            create: data.questions.map((q, i) => ({
              ...q,
              position: i + 1,
              options: {
                create: q.options.map((o, j) => ({ ...o, position: j })),
              },
            })),
          },
        },
        include: templateInclude,
      });
    });
    res.status(201).json(result);
  });
  const ownProgram = async (id: string | null, userId: string) => {
    if (id && !(await db.program.findFirst({ where: { id, ownerId: userId } })))
      throw new HttpError(400, "Programa não disponível");
  };
  app.get("/api/students", async (_req, res) =>
    res.json(
      await db.student.findMany({
        where: { personalId: identity(res).id, linkStatus: { not: "ended" } },
        include: {
          program: true,
          evaluations: {
            select: { id: true, date: true, status: true },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      }),
    ),
  );
  app.post("/api/students", async (req, res) => {
    const data = studentSchema.parse(req.body);
    await ownProgram(data.programId, identity(res).id);
    res.status(201).json(
      await db.student.create({
        data: {
          ...data,
          personalId: identity(res).id,
          history: { create: { action: "Cadastro criado", detail: {} } },
        },
      }),
    );
  });
  app.use("/api/students/:id", async (req, res, next) => {
    if (
      !(await db.student.findFirst({
        where: {
          id: String(req.params.id),
          personalId: identity(res).id,
          linkStatus: { not: "ended" },
        },
      }))
    )
      throw new HttpError(404, "Aluno não encontrado ou vínculo encerrado");
    next();
  });
  app.get("/api/students/:id", async (req, res) =>
    res.json(
      await db.student.findUnique({
        where: { id: String(req.params.id) },
        include: studentInclude,
      }),
    ),
  );
  app.put("/api/students/:id", async (req, res) => {
    const data = studentSchema.parse(req.body);
    await ownProgram(data.programId, identity(res).id);
    const id = String(req.params.id);
    const s = await db.$transaction(async (tx) => {
      const before = await tx.student.findUniqueOrThrow({ where: { id } });
      const updated = await tx.student.update({ where: { id }, data });
      await tx.historyEntry.create({
        data: {
          studentId: id,
          action: "Cadastro atualizado",
          detail: { before: JSON.parse(JSON.stringify(before)) },
        },
      });
      return updated;
    });
    res.json(s);
  });
  app.delete("/api/students/:id", async (req, res) => {
    const s = await db.student.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    if (s.accountId)
      throw new HttpError(
        409,
        "Este histórico pertence a um aluno vinculado. Encerre o vínculo; a exclusão definitiva está na conta do aluno.",
      );
    await db.student.delete({ where: { id: s.id } });
    res.json({ ok: true });
  });
  app.get("/api/students/:id/export", async (req, res) => {
    const s = await db.student.findUnique({
      where: { id: String(req.params.id) },
      include: { ...studentInclude, workoutPlans: { include: planInclude } },
    });
    res.attachment(`tapago-${req.params.id}.json`).json({
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      student: s,
    });
  });
  app.post("/api/students/:id/invite", async (req, res) => {
    const code = newToken();
    await db.$transaction(async (tx) => {
      const s = await tx.student.findUniqueOrThrow({
        where: { id: String(req.params.id) },
      });
      if (s.accountId) throw new HttpError(409, "Aluno já vinculado");
      await tx.invitation.deleteMany({ where: { studentId: s.id } });
      await tx.invitation.create({
        data: {
          studentId: s.id,
          tokenHash: sessionKey(code),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });
    });
    res.json({ code, expiresInHours: 48 });
  });
  app.post("/api/students/:id/revoke", async (req, res) => {
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: String(req.params.id) },
        data: { linkStatus: "ended" },
      });
      const registration = await tx.enrollmentRequest.findUnique({
        where: { studentId: String(req.params.id) },
      });
      if (registration)
        await tx.enrollmentRequest.update({
          where: { id: registration.id },
          data: {
            status: "inactive",
            healthPayload: null,
            events: { create: { status: "inactive" } },
          },
        });
      await tx.invitation.deleteMany({
        where: { studentId: String(req.params.id) },
      });
      await tx.historyEntry.create({
        data: {
          studentId: String(req.params.id),
          action: "Vínculo encerrado pelo personal",
          detail: {},
        },
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/students/:id/evaluations", async (req, res) =>
    res
      .status(201)
      .json(
        await saveEvaluation(
          db,
          String(req.params.id),
          req.body,
          undefined,
          identity(res).id,
        ),
      ),
  );
  app.put("/api/students/:id/evaluations/:evaluationId", async (req, res) =>
    res.json(
      await saveEvaluation(
        db,
        String(req.params.id),
        req.body,
        String(req.params.evaluationId),
        identity(res).id,
      ),
    ),
  );
  app.delete(
    "/api/students/:id/evaluations/:evaluationId",
    async (req, res) => {
      await db.$transaction(async (tx) => {
        const e = await tx.evaluation.findFirst({
          where: {
            id: String(req.params.evaluationId),
            studentId: String(req.params.id),
          },
        });
        if (!e) throw new HttpError(404, "Avaliação não encontrada");
        if (e.status === "concluida")
          throw new HttpError(409, "Avaliações concluídas são preservadas");
        await tx.evaluation.delete({ where: { id: e.id } });
        await tx.historyEntry.create({
          data: {
            studentId: e.studentId,
            action: "Rascunho excluído",
            detail: { evaluationId: e.id },
          },
        });
      });
      res.json({ ok: true });
    },
  );
  app.post("/api/students/:id/records", async (req, res) => {
    const input = recordSchema.parse(req.body);
    const data = recordSchemas[input.kind].parse(input.data);
    const r = await db.$transaction(async (tx) => {
      const r = await tx.trackingRecord.create({
        data: {
          studentId: String(req.params.id),
          date: input.date,
          kind: input.kind,
          data,
        },
      });
      await tx.historyEntry.create({
        data: {
          studentId: r.studentId,
          action: "Registro adicionado",
          detail: { recordId: r.id, kind: r.kind, date: r.date },
        },
      });
      return r;
    });
    res.status(201).json(r);
  });
  app.put("/api/students/:id/records/:recordId", async (req, res) => {
    const input = recordSchema.parse(req.body);
    const data = recordSchemas[input.kind].parse(input.data);
    const r = await db.$transaction(async (tx) => {
      const before = await tx.trackingRecord.findFirst({
        where: {
          id: String(req.params.recordId),
          studentId: String(req.params.id),
        },
      });
      if (!before) throw new HttpError(404, "Registro não encontrado");
      if (before.kind !== input.kind)
        throw new HttpError(400, "Tipo de registro não pode mudar");
      const r = await tx.trackingRecord.update({
        where: { id: before.id },
        data: { date: input.date, data },
      });
      await tx.historyEntry.create({
        data: {
          studentId: before.studentId,
          action: "Registro corrigido",
          detail: { before: JSON.parse(JSON.stringify(before)) },
        },
      });
      return r;
    });
    res.json(r);
  });
  app.delete("/api/students/:id/records/:recordId", async (req, res) => {
    await db.$transaction(async (tx) => {
      const r = await tx.trackingRecord.findFirst({
        where: {
          id: String(req.params.recordId),
          studentId: String(req.params.id),
        },
      });
      if (!r) throw new HttpError(404, "Registro não encontrado");
      await tx.trackingRecord.delete({ where: { id: r.id } });
      await tx.historyEntry.create({
        data: {
          studentId: r.studentId,
          action: "Registro excluído",
          detail: { before: JSON.parse(JSON.stringify(r)) },
        },
      });
    });
    res.json({ ok: true });
  });
  app.use("/api", () => {
    throw new HttpError(404, "Recurso não encontrado");
  });
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
        return;
      }
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (typeof error === "object" && error && "code" in error) {
        if (error.code === "P2025") {
          res.status(404).json({ error: "Registro não encontrado" });
          return;
        }
        if (error.code === "P2002" || error.code === "P2003") {
          res
            .status(409)
            .json({ error: "Cadastro duplicado ou vínculo inválido" });
          return;
        }
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: "JSON inválido" });
        return;
      }
      console.error(
        "Falha interna:",
        error instanceof Error ? error.name : "erro",
      );
      res.status(500).json({ error: "Não foi possível concluir a operação" });
    },
  );
  return app;
}
