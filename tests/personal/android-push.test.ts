import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {generateKeyPairSync,verify,createHash} from 'node:crypto';
import {createDb} from '../../server/db';
import {createTestApp,provisionPersonal} from './fixtures';
import {androidMessage,androidInstallation,androidToken,dispatchAndroidPush,fcmAssertion} from '../../server/android-push';
import {seal} from '../../server/enrollment-crypto';

const folder=fs.mkdtempSync(path.join(tmpdir(),'tapago-android-push-')),url=`file:${folder}/test.db`,db=createDb(url),app=createTestApp(db);
const owner=request.agent(app),other=request.agent(app),headers={'X-Requested-With':'TaPago'},installation='01234567-89ab-cdef-0123-456789abcdef',token='synthetic-token-for-native-android:1234567890';
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),credentials={type:'service_account',project_id:'synthetic-test-project',client_email:'fcm@synthetic-test-project.iam.gserviceaccount.com',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'}).toString()};
const stateFile=()=>path.join(folder,'push/android',createHash('sha256').update(installation).digest('hex')+'.json');
let ownerId:string,otherId:string;
beforeAll(async()=>{
 process.env.PERSONAL_PUSH_DIRECTORY=path.join(folder,'push');process.env.PERSONAL_ENROLLMENT_KEY='ab'.repeat(32);
 fs.writeFileSync(path.join(folder,'service.json'),JSON.stringify(credentials));process.env.PERSONAL_FCM_SERVICE_ACCOUNT_FILE=path.join(folder,'service.json');
 fs.writeFileSync(path.join(folder,'test.db'),'');execFileSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],{env:{...process.env,PERSONAL_DATABASE_URL:url},stdio:'pipe'});
 for(const [agent,email] of [[owner,'android-a@example.test'],[other,'android-b@example.test']] as const){const user=await provisionPersonal(db,{name:'Personal Sintético',email,password:'senha-ficticia-12345'});if(agent===owner)ownerId=user.id;else otherId=user.id;await agent.post('/api/auth/login').set(headers).send({email,password:'senha-ficticia-12345'});}
},60000);
afterAll(async()=>{await db.$disconnect();for(const key of ['PERSONAL_PUSH_DIRECTORY','PERSONAL_ENROLLMENT_KEY','PERSONAL_FCM_SERVICE_ACCOUNT_FILE'])delete process.env[key];fs.rmSync(folder,{recursive:true,force:true});});
it('assina OAuth RS256 para o escopo FCM e não aceita instalação/token arbitrários',()=>{
 const jwt=fcmAssertion(credentials).split('.');expect(verify('sha256',Buffer.from(jwt[0]+'.'+jwt[1]),pair.publicKey,Buffer.from(jwt[2],'base64url'))).toBe(true);
 expect(JSON.parse(Buffer.from(jwt[1],'base64url').toString())).toMatchObject({aud:'https://oauth2.googleapis.com/token',scope:'https://www.googleapis.com/auth/firebase.messaging'});
 expect(androidInstallation(installation)).toBe(true);expect(androidToken(token)).toBe(true);
 for(const value of [null,'../file','https://evil.test',{},'x'.repeat(5000)]){expect(androidInstallation(value)).toBe(false);expect(androidToken(value)).toBe(false);}
});
it('registra só com autenticação, cifra o token e preserva o vínculo na rotação',async()=>{
 expect((await request(app).post('/api/notifications/android/subscribe').set(headers).send({installation,token})).status).toBe(401);
 expect((await owner.post('/api/notifications/android/subscribe').set(headers).send({installation:'../file',token})).status).toBe(400);
 const first=await owner.post('/api/notifications/android/subscribe').set(headers).send({installation,token});expect(first.status).toBe(200);expect(first.body.binding).toMatch(/^[a-f0-9]{32}$/);
 expect(fs.readFileSync(stateFile(),'utf8')).not.toContain(token);
 const second=await owner.post('/api/notifications/android/subscribe').set(headers).send({installation,token:token+'rotated'});expect(second.body.binding).toBe(first.body.binding);
 const pupil=request.agent(app);await pupil.post('/api/auth/register').set(headers).send({name:'Aluno Sintético',email:'android-p@example.test',password:'senha-ficticia-12345',role:'student'});
 expect((await pupil.post('/api/notifications/android/subscribe').set(headers).send({installation,token})).status).toBe(403);
});
it('envia o ID certo com prioridade alta, sem nome ou dados do aluno e sem repetir',async()=>{
 const enrollment=await db.enrollmentRequest.create({data:{personalId:ownerId,emailHash:'synthetic-android',payload:seal({name:'Nome Sensível Sintético'}),policyVersion:'test',consentAt:new Date()}});
 const transport=vi.fn(async(message:ReturnType<typeof androidMessage>)=>{expect(message.message.data.id).toBe(enrollment.id);expect(message.message.android.priority).toBe('HIGH');expect(JSON.stringify(message)).not.toContain('Nome Sensível');expect(message.message).not.toHaveProperty('notification');return 'sent' as const;});
 expect((await dispatchAndroidPush(db,ownerId,transport,[ownerId,otherId])).sent).toBe(1);expect((await dispatchAndroidPush(db,ownerId,transport,[ownerId,otherId])).sent).toBe(0);expect(transport).toHaveBeenCalledTimes(1);
 for(const kind of ['feedback','workout_completed'] as const)expect(androidMessage(token,'binding',{id:kind+':123',kind}).message.data.id).toBe(kind+':123');
});
it('isola teste e cancelamento por dono, espera o atraso e impede repetição',async()=>{
 expect((await other.post('/api/notifications/android/test').set(headers).send({installation})).status).toBe(404);
 await other.post('/api/notifications/android/unsubscribe').set(headers).send({installation});expect(fs.existsSync(stateFile())).toBe(true);
 expect((await owner.post('/api/notifications/android/test').set(headers).send({installation})).status).toBe(200);
 expect((await owner.post('/api/notifications/android/test').set(headers).send({installation})).status).toBe(429);
 expect((await dispatchAndroidPush(db,ownerId,async()=>{throw Error('ainda não venceu');},[ownerId])).failed).toBe(0);
 const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now()+16000);try{expect((await dispatchAndroidPush(db,ownerId,async()=> 'sent',[ownerId])).sent).toBe(1);expect((await dispatchAndroidPush(db,ownerId,async()=> 'sent',[ownerId])).sent).toBe(0);}finally{clock.mockRestore();}
});
it('respeita backoff, remove token expirado e muda vínculo ao trocar de conta',async()=>{
 const first=JSON.parse(fs.readFileSync(stateFile(),'utf8')).binding;
 await db.enrollmentRequest.create({data:{personalId:ownerId,emailHash:'synthetic-android-retry',payload:seal({name:'Outro Sintético'}),policyVersion:'test',consentAt:new Date()}});
 expect((await dispatchAndroidPush(db,ownerId,async()=> 'failed',[ownerId])).failed).toBe(1);
 expect((await dispatchAndroidPush(db,ownerId,async()=> 'sent',[ownerId])).sent).toBe(0);
 const state=JSON.parse(fs.readFileSync(stateFile(),'utf8'));state.retryAt=0;fs.writeFileSync(stateFile(),JSON.stringify(state));
 expect((await dispatchAndroidPush(db,ownerId,async()=> 'expired',[ownerId])).expired).toBe(1);expect(fs.existsSync(stateFile())).toBe(false);
 const second=await other.post('/api/notifications/android/subscribe').set(headers).send({installation,token});expect(second.body.binding).not.toBe(first);
 expect((await dispatchAndroidPush(db,undefined,async()=> 'sent',[ownerId])).sent).toBe(0);expect(fs.existsSync(stateFile())).toBe(false);
});
