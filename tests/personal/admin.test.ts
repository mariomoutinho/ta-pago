import {beforeAll,afterAll,it,expect} from 'vitest';
import request from 'supertest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createDb} from '../../server/db';
import {createTestApp,provisionPersonal,authorizeFixtureAdmin,revokeFixtureAdmin} from './fixtures';
const folder=mkdtempSync(path.join(tmpdir(),'tapago-admin-')),url='file:'+folder+'/test.db';
const db=createDb(url),app=createTestApp(db),admin=request.agent(app),teacher=request.agent(app),student=request.agent(app);
const header={'X-Requested-With':'TaPago'};let adminId:string,teacherId:string;
beforeAll(async()=>{
  writeFileSync(path.join(folder,'test.db'),'');execFileSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],{env:{...process.env,PERSONAL_DATABASE_URL:url},stdio:'pipe'});
  adminId=(await provisionPersonal(db,{name:'Administrador Teste',email:'admin@example.test',password:'SenhaTeste123!'})).id;
  teacherId=(await provisionPersonal(db,{name:'Professor Teste',email:'teacher@example.test',password:'SenhaTeste123!'})).id;
  authorizeFixtureAdmin(adminId);
  for(const [agent,email] of [[admin,'admin@example.test'],[teacher,'teacher@example.test']] as const)expect((await agent.post('/api/auth/login').set(header).send({email,password:'SenhaTeste123!'})).status).toBe(200);
  const registered=await student.post('/api/auth/register').set(header).send({name:'André Teste',email:'andre@example.test',password:'SenhaTeste123!',role:'student',isAdmin:true});
  expect(registered.body.user.isAdmin).toBe(false);
  await db.student.create({data:{name:'André Ficha',email:'andre@example.test',personalId:teacherId,accountId:registered.body.user.id,startDate:'2026-11-26',mainGoal:'Meta privada',injuries:'Informação privada'}});
  await db.student.create({data:{name:'Aluno sem login',email:'sem-login@example.test',personalId:teacherId,startDate:'2026-11-26',mainGoal:'Meta privada'}});
},60000);
afterAll(async()=>{await db.$disconnect();rmSync(folder,{recursive:true,force:true});});
it('restringe a administração e ignora privilégio forjado no login/cadastro',async()=>{
  expect((await request(app).get('/api/admin/profiles')).status).toBe(401);
  expect((await teacher.get('/api/admin/profiles')).status).toBe(403);
  expect((await student.get('/api/admin/profiles')).status).toBe(403);
  expect((await teacher.post('/api/auth/login').set(header).send({email:'teacher@example.test',password:'SenhaTeste123!',isAdmin:true})).body.user.isAdmin).toBe(false);
  expect((await admin.get('/api/auth/status')).body.user.isAdmin).toBe(true);
});
it('lista somente dados administrativos e não duplica aluno já vinculado à conta',async()=>{
  const result=await admin.get('/api/admin/profiles');expect(result.status).toBe(200);
  expect(result.body.counts).toEqual({personal:2,student:2,withoutLogin:1});
  expect(JSON.stringify(result.body)).not.toMatch(/password|Hash|injuries|Meta privada|Informação privada/);
  const search=await admin.get('/api/admin/profiles?q=Andre&role=student');
  expect(search.body.total).toBe(1);expect(search.body.items[0].teachers).toEqual(['Professor Teste']);
  expect((await admin.get('/api/admin/profiles?role=personal')).body.items.every((p:{role:string})=>p.role==='personal')).toBe(true);
});
it('pagina resultados e rejeita filtros inválidos',async()=>{
  for(let i=0;i<27;i++)await db.student.create({data:{name:'Livre '+i,email:'livre'+i+'@example.test',personalId:teacherId,startDate:'2026-11-26',mainGoal:''}});
  const first=await admin.get('/api/admin/profiles?q=Livre&page=1');const second=await admin.get('/api/admin/profiles?q=Livre&page=2');
  expect(first.body.total).toBe(27);expect(first.body.items).toHaveLength(25);expect(second.body.items).toHaveLength(2);
  expect((await admin.get('/api/admin/profiles?page=0')).status).toBe(400);
  expect((await admin.get('/api/admin/profiles?role=admin')).status).toBe(400);
});
it('revoga acesso administrativo na sessão existente',async()=>{
  revokeFixtureAdmin(adminId);expect((await admin.get('/api/admin/profiles')).status).toBe(403);
  expect((await admin.get('/api/auth/status')).body.user.isAdmin).toBe(false);
});
