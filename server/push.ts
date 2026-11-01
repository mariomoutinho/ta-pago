import fs from "node:fs";
import path from "node:path";
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { Router } from "express";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import { seal, unseal } from "./enrollment-crypto";
import { retentionDays } from "./enrollment";
import { newsEvents, newsFeed, markNewsRead } from "./news";

const root = () => path.resolve(process.env.PERSONAL_PUSH_DIRECTORY ?? "data/push");
type Subscription = { owner: string; endpoint: string; since: string; sent: string[]; attempts: number; retryAt: number; testAt?:number;lastTestAt?:number;lastAcceptedAt?:string;lastReceivedAt?:string;lastDisplaySucceeded?:boolean };
export function pushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 4096 && url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      (["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com"].includes(url.hostname) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}
function key() {
  fs.mkdirSync(root(), { recursive: true, mode: 0o700 });
  const file = path.join(root(), "vapid-private.pem");
  if (!fs.existsSync(file)) {
    const generated = generateKeyPairSync("ec", { namedCurve: "prime256v1", privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    try { fs.writeFileSync(file, generated.privateKey, { flag: "wx", mode: 0o600 }); } catch (error: any) { if (error.code !== "EEXIST") throw error; }
  }
  return createPrivateKey(fs.readFileSync(file));
}
export function pushPublicKey() {
  const jwk = createPublicKey(key()).export({ format: "jwk" });
  return Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, "base64url"), Buffer.from(jwk.y!, "base64url")]).toString("base64url");
}
export function pushAuthorization(endpoint: string) {
  if (!pushEndpoint(endpoint)) throw new HttpError(400, "Destino push inválido");
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = encode({ typ: "JWT", alg: "ES256" }) + "." + encode({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 3600, sub: process.env.PERSONAL_ENROLLMENT_ORIGIN ?? "https://tapago.coletivopindorama.com.br" });
  const signature = sign("sha256", Buffer.from(input), { key: key(), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `vapid t=${input}.${signature}, k=${pushPublicKey()}`;
}
const fileFor = (endpoint: string) => path.join(root(), createHash("sha256").update(endpoint).digest("hex") + ".json");
function save(file: string, state: Subscription) { const temp = file + ".tmp"; fs.writeFileSync(temp, JSON.stringify(state), { mode: 0o600 }); fs.renameSync(temp, file); }
async function locked<T>(file: string, action: () => Promise<T>): Promise<T | null> {
  const lock = file + ".lock";
  if (fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs > 120000) { try { fs.unlinkSync(lock); } catch {} }
  let descriptor: number;
  try { descriptor = fs.openSync(lock, "wx", 0o600); } catch { return null; }
  try { return await action(); } finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
}
export async function dispatchPush(db: Db, owner?: string, transport?: (endpoint: string, authorization: string) => Promise<number>, authorizedIds = (process.env.PERSONAL_AUTHORIZED_IDS ?? "").split(",").map(value => value.trim())) {
  const counts = { sent: 0, failed: 0, expired: 0 };
  fs.mkdirSync(root(), { recursive: true, mode: 0o700 });
  for (const name of fs.readdirSync(root()).filter(name => /^[a-f0-9]{64}\.json$/.test(name))) {
    const file = path.join(root(), name);
    await locked(file, async () => {
      if (!fs.existsSync(file)) return;
      const state: Subscription = JSON.parse(fs.readFileSync(file, "utf8"));
      if ((owner && state.owner !== owner) || state.retryAt > Date.now()) return;
      const authorized = authorizedIds.includes(state.owner);
      if (!authorized && !transport) { fs.unlinkSync(file); return; }
      const since=Math.max(Date.parse(state.since),Date.now()-86400000);
      const rows = (await newsEvents(db,state.owner)).filter(item=>Date.parse(item.createdAt)>=since);
      const ids = rows.map(row => row.id);
      const testDue=state.testAt!==undefined&&state.testAt<=Date.now();
      if (!ids.some(id => !state.sent.includes(id))&&!testDue) return;
      try {
        const endpoint = unseal<{ endpoint: string }>(state.endpoint).endpoint;
        const authorization = pushAuthorization(endpoint);
        const status = transport ? await transport(endpoint, authorization) : (await fetch(endpoint, { method: "POST", headers: { Authorization: authorization, TTL: "86400", Urgency: "normal" }, body: "", redirect: "error", signal: AbortSignal.timeout(5000) as NonNullable<Parameters<typeof fetch>[1]>["signal"] })).status;
        if (status >= 200 && status < 300) { state.sent = ids; state.retryAt = 0; state.attempts = 0;state.lastAcceptedAt=new Date().toISOString();if(testDue)delete state.testAt; counts.sent++; }
        else if ([404, 410].includes(status)) { fs.unlinkSync(file); counts.expired++; return; }
        else throw new Error("Push provider");
      } catch { state.attempts++; state.retryAt = Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(state.attempts - 1, 6)); counts.failed++; }
      save(file, state);
    }).catch(() => { counts.failed++; });
  }
  return counts;
}
export function notificationRoutes(db: Db) {
  const router = Router();
  router.use((_req, res, next) => { if (res.locals.user.role !== "personal") throw new HttpError(403, "Acesso exclusivo do personal"); next(); });
  router.get("/summary", async (_req, res) => res.json({ pending: await db.enrollmentRequest.count({ where: { personalId: res.locals.user.id, status: "pending", updatedAt: { gte: new Date(Date.now() - retentionDays() * 86400000) } } }),unread:(await newsFeed(db,res.locals.user.id)).filter(item=>!item.read).length }));
  router.get("/feed",async(_req,res)=>res.json(await newsFeed(db,res.locals.user.id)));
  router.post("/read",async(req,res)=>{await markNewsRead(db,res.locals.user.id,req.body.ids);res.json({ok:true});});
  router.get("/settings", (_req, res) => res.json({ publicKey: pushPublicKey() }));
  router.post('/receipt',async(req,res)=>{
    const {endpoint,shown}=req.body;if(typeof endpoint!=='string'||!pushEndpoint(endpoint)||typeof shown!=='boolean')throw new HttpError(400,'Confirmação inválida');
    const file=fileFor(endpoint);fs.mkdirSync(root(),{recursive:true,mode:0o700});
    const result=await locked(file,async()=>{
      if(!fs.existsSync(file))throw new HttpError(404,'Inscrição não encontrada');
      const state:Subscription=JSON.parse(fs.readFileSync(file,'utf8'));
      if(state.owner!==res.locals.user.id)throw new HttpError(404,'Inscrição não encontrada');
      state.lastReceivedAt=new Date().toISOString();state.lastDisplaySucceeded=shown;save(file,state);return true;
    });if(!result)throw new HttpError(409,'Tente novamente');res.json({ok:true});
  });
  router.post('/test',async(req,res)=>{
    const endpoint=req.body.endpoint;if(typeof endpoint!=='string'||!pushEndpoint(endpoint))throw new HttpError(400,'Inscrição inválida');
    const file=fileFor(endpoint);fs.mkdirSync(root(),{recursive:true,mode:0o700});
    const result=await locked(file,async()=>{
      if(!fs.existsSync(file))throw new HttpError(409,'Ative as notificações neste aparelho antes de testar');
      const state:Subscription=JSON.parse(fs.readFileSync(file,'utf8'));
      if(state.owner!==res.locals.user.id)throw new HttpError(404,'Inscrição não encontrada');
      if(Date.now()-(state.lastTestAt??0)<90000)throw new HttpError(429,'Aguarde o teste anterior antes de tentar novamente');
      state.testAt=Date.now()+15000;state.lastTestAt=Date.now();save(file,state);return true;
    });if(!result)throw new HttpError(409,'Tente novamente');res.json({scheduled:true});
  });
  for (const action of ["subscribe", "unsubscribe"] as const) router.post("/" + action, async (req, res) => {
    const endpoint = req.body.endpoint;
    if (typeof endpoint !== "string" || !pushEndpoint(endpoint)) throw new HttpError(400, "Este serviço de notificações não é compatível");
    pushPublicKey(); const file = fileFor(endpoint), owner = res.locals.user.id;
    const result = await locked(file, async () => {
      const old: Subscription | null = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
      if (action === "unsubscribe") { if (old?.owner === owner) fs.unlinkSync(file); return true; }
      if (old?.owner === owner) return true;
      const count = fs.readdirSync(root()).filter(name => name.endsWith(".json")).map(name => JSON.parse(fs.readFileSync(path.join(root(), name), "utf8"))).filter(state => state.owner === owner).length;
      if (count >= 10) throw new HttpError(409, "Limite de aparelhos atingido");
      save(file, { owner, endpoint: seal({ endpoint }), since: new Date().toISOString(), sent: [], attempts: 0, retryAt: 0 }); return true;
    });
    if (result === null) throw new HttpError(409, "Tente novamente em alguns instantes");
    res.json({ ok: true });
  });
  return router;
}
