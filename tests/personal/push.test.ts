import { beforeAll, afterAll, it, expect,vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createPublicKey, verify } from "node:crypto";
import { createDb } from "../../server/db";
import { createTestApp, provisionPersonal } from "./fixtures";
import { dispatchPush, pushAuthorization, pushEndpoint, pushPublicKey } from "../../server/push";
import { seal } from "../../server/enrollment-crypto";
const folder=fs.mkdtempSync(path.join(tmpdir(),"tapago-push-"));
const url=`file:${folder}/test.db`,db=createDb(url),app=createTestApp(db),owner=request.agent(app),other=request.agent(app);
const headers={"X-Requested-With":"TaPago"},endpoint="https://fcm.googleapis.com/fcm/send/synthetic-subscription";
let ownerId:string;
beforeAll(async()=>{
  process.env.PERSONAL_PUSH_DIRECTORY=path.join(folder,"push");process.env.PERSONAL_ENROLLMENT_KEY="ab".repeat(32);
  fs.writeFileSync(path.join(folder,"test.db"),"");
  execFileSync(process.execPath,[path.resolve("node_modules/prisma/build/index.js"),"migrate","deploy"],{env:{...process.env,PERSONAL_DATABASE_URL:url},stdio:"pipe"});
  for(const [agent,email] of [[owner,"push-a@example.test"],[other,"push-b@example.test"]] as const){
    const user=await provisionPersonal(db,{name:"Personal Sintético",email,password:"senha-ficticia-12345"});if(agent===owner)ownerId=user.id;
    await agent.post("/api/auth/login").set(headers).send({email,password:"senha-ficticia-12345"});
  }
},60000);
afterAll(async()=>{await db.$disconnect();delete process.env.PERSONAL_PUSH_DIRECTORY;delete process.env.PERSONAL_ENROLLMENT_KEY;fs.rmSync(folder,{recursive:true,force:true});});
it("valida destinos e assinatura VAPID ES256 sem expor chave privada",()=>{
  for(const value of ["https://127.0.0.1/push","http://fcm.googleapis.com/x","https://fcm.googleapis.com.evil.test/x","https://u:p@fcm.googleapis.com/x","https://fcm.googleapis.com:8443/x"])expect(pushEndpoint(value)).toBe(false);
  expect(pushEndpoint(endpoint)).toBe(true);
  const publicKey=Buffer.from(pushPublicKey(),"base64url");expect(publicKey.length).toBe(65);
  const authorization=pushAuthorization(endpoint),jwt=authorization.slice(8).split(", k=")[0],parts=jwt.split(".");
  const publicObject=createPublicKey({format:"jwk",key:{kty:"EC",crv:"P-256",x:publicKey.subarray(1,33).toString("base64url"),y:publicKey.subarray(33).toString("base64url")}});
  expect(verify("sha256",Buffer.from(parts[0]+"."+parts[1]),{key:publicObject,dsaEncoding:"ieee-p1363"},Buffer.from(parts[2],"base64url"))).toBe(true);
  expect(JSON.parse(Buffer.from(parts[1],"base64url").toString()).aud).toBe("https://fcm.googleapis.com");
});
it("conta apenas pendências do dono, cifra inscrição e entrega sem duplicar",async()=>{
  expect((await request(app).get("/api/notifications/summary")).status).toBe(401);
  expect((await owner.post("/api/notifications/subscribe").set(headers).send({endpoint:"https://127.0.0.1/push"})).status).toBe(400);
  expect((await owner.post("/api/notifications/subscribe").set(headers).send({endpoint})).status).toBe(200);
  const pending=await db.enrollmentRequest.create({data:{personalId:ownerId,emailHash:"synthetic",payload:seal({name:"Aluno Sintético"}),policyVersion:"test",consentAt:new Date()}});
  expect((await owner.get("/api/notifications/summary")).body).toMatchObject({pending:1,unread:1});
  expect((await other.get("/api/notifications/summary")).body).toMatchObject({pending:0,unread:0});
  const news=(await owner.get('/api/notifications/feed')).body;
  expect(news[0].title).toContain('Aluno Sintético');expect(news[0].read).toBe(false);
  expect((await other.post('/api/notifications/read').set(headers).send({ids:[pending.id]})).status).toBe(404);
  expect((await owner.post('/api/notifications/read').set(headers).send({ids:[pending.id]})).status).toBe(200);
  expect((await owner.get('/api/notifications/summary')).body.unread).toBe(0);
  expect((await owner.get('/api/notifications/feed')).body[0].read).toBe(true);
  const file=path.join(folder,"push",fs.readdirSync(path.join(folder,"push")).find(file=>file.endsWith(".json"))!);
  expect(fs.readFileSync(file,"utf8")).not.toContain(endpoint);
  expect((await dispatchPush(db,ownerId,async()=>201)).sent).toBe(1);
  expect((await dispatchPush(db,ownerId,async()=>{throw Error("não deveria reenviar");})).sent).toBe(0);
  await db.enrollmentRequest.update({where:{id:pending.id},data:{status:"rejected"}});
  expect((await owner.get("/api/notifications/summary")).body.pending).toBe(0);
});
it("repete falhas com espera e remove inscrição expirada",async()=>{
  await db.enrollmentRequest.create({data:{personalId:ownerId,emailHash:"synthetic-retry",payload:seal({name:"Outro Sintético"}),policyVersion:"test",consentAt:new Date()}});
  expect((await dispatchPush(db,ownerId,async()=>503)).failed).toBe(1);
  expect((await dispatchPush(db,ownerId,async()=>201)).sent).toBe(0);
  const file=path.join(folder,"push",fs.readdirSync(path.join(folder,"push")).find(file=>file.endsWith(".json"))!);
  const state=JSON.parse(fs.readFileSync(file,"utf8"));state.retryAt=0;fs.writeFileSync(file,JSON.stringify(state));
  expect((await dispatchPush(db,ownerId,async()=>410)).expired).toBe(1);
  expect(fs.existsSync(file)).toBe(false);
});
it('agenda teste só para o aparelho do dono e envia uma única vez após o atraso',async()=>{
 const testEndpoint=endpoint+'-background';
 await owner.post('/api/notifications/subscribe').set(headers).send({endpoint:testEndpoint});
 expect((await other.post('/api/notifications/test').set(headers).send({endpoint:testEndpoint})).status).toBe(404);
 expect((await owner.post('/api/notifications/test').set(headers).send({endpoint:testEndpoint})).body.scheduled).toBe(true);
 expect((await owner.post('/api/notifications/test').set(headers).send({endpoint:testEndpoint})).status).toBe(429);
 expect((await dispatchPush(db,ownerId,async()=>{throw Error('Teste ainda não venceu');})).sent).toBe(0);
 const time=Date.now();const clock=vi.spyOn(Date,'now').mockReturnValue(time+16000);
 try{expect((await dispatchPush(db,ownerId,async()=>201)).sent).toBe(1);expect((await dispatchPush(db,ownerId,async()=>201)).sent).toBe(0);}finally{clock.mockRestore();}
});
