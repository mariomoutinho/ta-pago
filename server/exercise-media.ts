import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db";
import { HttpError } from "./evaluations";

export const videoLimit = 25 * 1024 * 1024;
const root = () => path.resolve(process.env.PERSONAL_MEDIA_DIRECTORY ?? "data/exercise-videos");
const ownerKey = (id: string) => createHash("sha256").update(id).digest("hex");
const locks = new Set<string>();
export function validateVideoOwner(url: string, ownerId: string) {
  if (!url) return;
  const pathname = new URL(url).pathname;
  if (!pathname.includes("/api/exercise-videos/")) return;
  const match = /^\/api\/exercise-videos\/([a-f0-9]{64})\/([a-f0-9]{32})\.mp4$/.exec(pathname);
  if (!match || match[1] !== ownerKey(ownerId) || !fs.existsSync(path.join(root(), match[1], match[2] + ".mp4")))
    throw new HttpError(400, "Vídeo indisponível");
}
export function exerciseMediaRoutes(db: Db) {
  const router = Router();
  router.put("/exercise-videos", async (req, res) => {
    const user = res.locals.user;
    if (user.role !== "personal") throw new HttpError(403, "Acesso exclusivo do personal");
    if (req.get("Content-Type")?.split(";")[0].toLowerCase() !== "video/mp4") throw new HttpError(415, "Selecione um vídeo MP4");
    if (Number(req.get("Content-Length")) > videoLimit) throw new HttpError(413, "O vídeo deve ter até 25 MB");
    const owner = ownerKey(user.id);
    if (locks.has(owner)) throw new HttpError(409, "Aguarde o envio atual terminar");
    locks.add(owner);
    const directory = path.join(root(), owner), id = randomBytes(16).toString("hex");
    const temporary = path.join(directory, id + ".part");
    let fd: number | undefined;
    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      const used = fs.readdirSync(directory).filter(file => file.endsWith(".mp4")).reduce((sum, file) => sum + fs.statSync(path.join(directory, file)).size, 0);
      if (used + videoLimit > 1024 * 1024 * 1024) throw new HttpError(413, "O armazenamento de vídeos está cheio. Entre em contato com o responsável.");
      fd = fs.openSync(temporary, "wx", 0o600);
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > videoLimit) throw new HttpError(413, "O vídeo deve ter até 25 MB");
        fs.writeSync(fd, chunk);
      }
      fs.closeSync(fd); fd = undefined;
      const head = Buffer.alloc(32), source = fs.openSync(temporary, "r");
      fs.readSync(source, head); fs.closeSync(source);
      if (size <= 16 || head.toString("ascii", 4, 8) !== "ftyp" || !["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(head.toString("ascii", 8, 12)))
        throw new HttpError(415, "Arquivo inválido. Use um vídeo MP4 (H.264).");
      fs.renameSync(temporary, path.join(directory, id + ".mp4"));
      res.status(201).json({ url: `${req.protocol}://${req.get("host")}/api/exercise-videos/${owner}/${id}.mp4` });
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      locks.delete(owner);
    }
  });
  router.get("/exercise-videos/:owner/:file", async (req, res) => {
    const owner = String(req.params.owner), file = String(req.params.file), user = res.locals.user;
    if (!/^[a-f0-9]{64}$/.test(owner) || !/^[a-f0-9]{32}\.mp4$/.test(file)) throw new HttpError(404, "Vídeo não encontrado");
    let allowed = user.role === "personal" && ownerKey(user.id) === owner;
    if (!allowed && user.role === "student") {
      allowed = !!await db.workoutExercise.findFirst({ where: {
        deletedAt: null,
        OR: [{ exercise: { videoUrl: { endsWith: `/api/exercise-videos/${owner}/${file}` } } }, { alternativeExercise: { videoUrl: { endsWith: `/api/exercise-videos/${owner}/${file}` } } }],
        workout: { deletedAt: null, plan: { publishedAt: { not: null }, status: { in: ["ativo", "arquivado"] }, student: { accountId: user.id } } },
      } });
    }
    const target = path.join(root(), owner, file);
    if (!allowed || !fs.existsSync(target)) throw new HttpError(404, "Vídeo não encontrado");
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(target);
  });
  return router;
}
