import {beforeAll,afterAll,it,expect} from 'vitest';
import request from 'supertest';
import fs from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
import {createDb} from '../../server/db';import {createTestApp,provisionPersonal} from './fixtures';import {sessionKey} from '../../server/security';
const folder=fs.mkdtempSync(path.join(tmpdir(),'student-access-')),url=`file:${folder}/test.db`,db=createDb(url),app=createTestApp(db),owner=request.agent(app),other=request.agent(app),headers={'X-Requested-With':'TaPago'};
let ownerId:string,studentId:string,requestId:string;
beforeAll(async()=>{
 fs.writeFileSync(path.join(folder,'test.db'),'');execFileSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],{env:{...process.env,PERSONAL_DATABASE_URL:url},stdio:'pipe'});
 for(const [agent,email] of [[owner,'access-owner@example.test'],[other,'access-other@example.test']] as const){const user=await provisionPersonal(db,{name:'Personal Sintético',email,password:'senha-ficticia-12345'});if(agent===owner)ownerId=user.id;await agent.post('/api/auth/login').set(headers).send({email,password:'senha-ficticia-12345'});}
 const student=await db.student.create({data:{personalId:ownerId,name:'Aluno Acesso',email:'access-student@example.test',phone:'11999990000',startDate:'2026-11-01',mainGoal:'Mobilidade'}});studentId=student.id;
 const row=await db.enrollmentRequest.create({data:{personalId:ownerId,studentId,emailHash:'synthetic',payload:'not-needed-for-access',policyVersion:'test',consentAt:new Date(),status:'pending'}});requestId=row.id;
},60000);
afterAll(async()=>{await db.$disconnect();fs.rmSync(folder,{recursive:true,force:true});});
it('exige aprovação, isola o envio e nunca oferece senha existente',async()=>{
 expect((await request(app).post(`/api/enrollment/requests/${requestId}/access`).set(headers).send({})).status).toBe(401);
 expect((await other.post(`/api/enrollment/requests/${requestId}/access`).set(headers).send({})).status).toBe(404);
 expect((await owner.post(`/api/enrollment/requests/${requestId}/access`).set(headers).send({})).status).toBe(409);
 await db.enrollmentRequest.update({where:{id:requestId},data:{status:'active'}});
 const access=await owner.post(`/api/enrollment/requests/${requestId}/access`).set(headers).send({});expect(access.status).toBe(200);expect(access.body.email).toBe('access-student@example.test');expect(access.body.password).toBeUndefined();
 const code=new URL(access.body.url).searchParams.get('convite')!;
 expect(await db.invitation.findUnique({where:{tokenHash:sessionKey(code)}})).toBeTruthy();
 expect((await request(app).get('/api/public/student-access/'+code)).body.existingAccount).toBe(false);
 expect((await request(app).post('/api/public/student-access/'+code).set(headers).send({password:'curta'})).status).toBe(400);
 expect((await request(app).post('/api/public/student-access/'+code).set(headers).send({password:'abcdef',role:'personal',email:'forged@example.test'})).status).toBe(201);
 expect((await request(app).post('/api/auth/login').set(headers).send({email:'access-student@example.test',password:'abcdef'})).status).toBe(200);
 const user=await db.user.findUniqueOrThrow({where:{email:'access-student@example.test'}});expect(user.role).toBe('student');expect(user.passwordHash).not.toContain('senha-ficticia');
 expect((await db.student.findUniqueOrThrow({where:{id:studentId}})).accountId).toBe(user.id);
 expect((await request(app).post('/api/public/student-access/'+code).set(headers).send({password:'outra-senha-12345'})).status).toBe(400);
 const linked=await owner.post(`/api/enrollment/requests/${requestId}/access`).set(headers).send({});expect(linked.body.linked).toBe(true);expect(linked.body.url).toMatch(/\/entrar$/);
});
it('recusa convite expirado e não substitui a senha de uma conta existente',async()=>{
 const user=await db.user.findUniqueOrThrow({where:{email:'access-student@example.test'}});await db.student.update({where:{id:studentId},data:{accountId:null}});
 const code='b'.repeat(64);await db.invitation.deleteMany({where:{studentId}});const invite=await db.invitation.create({data:{studentId,tokenHash:sessionKey(code),expiresAt:new Date(Date.now()-1000)}});
 expect((await request(app).get('/api/public/student-access/'+code)).status).toBe(400);
 await db.invitation.update({where:{id:invite.id},data:{expiresAt:new Date(Date.now()+60000)}});
 expect((await request(app).get('/api/public/student-access/'+code)).body.existingAccount).toBe(true);
 expect((await request(app).post('/api/public/student-access/'+code).set(headers).send({password:'outra-senha-12345'})).status).toBe(409);
 expect((await db.user.findUniqueOrThrow({where:{id:user.id}})).passwordHash).toBe(user.passwordHash);
});
