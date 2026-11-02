import {beforeAll,afterAll,it,expect} from 'vitest';
import request from 'supertest';
import fs from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
import {createDb} from '../../server/db';import {createTestApp} from './fixtures';
const folder=fs.mkdtempSync(path.join(tmpdir(),'tapago-password-')),url=`file:${folder}/test.db`,db=createDb(url),app=createTestApp(db),headers={'X-Requested-With':'TaPago'};
beforeAll(async()=>{fs.writeFileSync(path.join(folder,'test.db'),'');execFileSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],{env:{...process.env,PERSONAL_DATABASE_URL:url},stdio:'pipe'});},60000);
afterAll(async()=>{await db.$disconnect();fs.rmSync(folder,{recursive:true,force:true});});
it('cadastro e login aceitam seis letras, números, símbolos, Unicode, espaços e senhas maiores que 128 caracteres',async()=>{
 const values=['abcdef','123456','!@#$%^','😀😀😀😀😀😀','      ','a'.repeat(129)];
 for(const [index,password] of values.entries()){
  const email=`password-${index}@example.test`;
  expect((await request(app).post('/api/auth/register').set(headers).send({name:'Aluno Sintético',email,password,role:'student'})).status).toBe(201);
  expect((await request(app).post('/api/auth/login').set(headers).send({email,password})).status).toBe(200);
 }
});
it('recusa menos de seis caracteres contando Unicode, sem consumir cadastro',async()=>{
 for(const password of ['','abcde','😀😀😀',null])expect((await request(app).post('/api/auth/register').set(headers).send({name:'Aluno Sintético',email:'invalid-password@example.test',password,role:'student'})).status).toBe(400);
 expect(await db.user.findUnique({where:{email:'invalid-password@example.test'}})).toBeNull();
});
