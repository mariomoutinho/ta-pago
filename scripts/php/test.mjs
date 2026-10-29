import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, createDecipheriv } from 'node:crypto';
import assert from 'node:assert/strict';

const php = process.env.PHP_BIN || 'php';
const run = (args, env=process.env) => {
  const p = spawnSync(php,args,{env,encoding:'utf8'});
  if(p.status!==0) throw new Error(p.stdout+'\n'+p.stderr);
  return p.stdout.trim();
};
const name='tapago_test_'+randomBytes(6).toString('hex');
const config=run(['backend-php/tests/setup.php',name]);
const env={...process.env,TAPAGO_CONFIG:config,TAPAGO_PRIVATE_DIR:path.resolve('backend-php')};
run(['backend-php/bin/console.php','schema','--apply'],env);
run(['backend-php/bin/console.php','seed','--apply'],env);
const salt='0123456789abcdef0123456789abcdef', password='Senha somente teste 123!';
const legacy=salt+':'+scryptSync(password,salt,64).toString('hex');
env.TEST_LEGACY_HASH=legacy; env.TEST_PASSWORD=password;
run(['backend-php/tests/unit.php'],env);
const log=fs.openSync('data/php-test-server.log','w');
const server=spawn(php,['-S','127.0.0.1:33317','backend-php/tests/router.php'],{env,stdio:['ignore',log,log],windowsHide:true});
let checks=0;
const client=()=>({cookie:''});
const teacher=client(), other=client(), pupil=client(), anon=client();
async function req(c,method,url,body,status=200,headers={}) {
  const res=await fetch('http://127.0.0.1:33317/tapago/api'+url,{method,headers:{'Content-Type':'application/json','X-Requested-With':'TaPago',Cookie:c.cookie,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json();
  assert.equal(res.status,status,`${method} ${url}: ${JSON.stringify(data)}`);
  const cookie=res.headers.get('set-cookie'); if(cookie)c.cookie=cookie.split(';')[0];
  checks++; return data;
}
try {
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:33317/tapago/api/health');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  await req(anon,'GET','/health');
  await req(anon,'GET','/students',undefined,401);
  const legacyClient=client();
  await req(legacyClient,'POST','/auth/login',{email:'legacy@example.test',password});
  const upgraded=JSON.parse(run(['backend-php/tests/dump.php'],env)).User.find(u=>u.email==='legacy@example.test');
  assert.ok(upgraded.passwordHash.startsWith('bcrypt-sha384:'),'Hash legado não atualizado');
  await req(anon,'POST','/auth/login',{email:[],password},400);
  for(const [c,email,role] of [[teacher,'a@example.test','personal'],[other,'b@example.test','personal'],[pupil,'p@example.test','student']]) {
    await req(c,'POST','/auth/register',{name:'Pessoa Teste',email,password,role},201);
    assert.match(c.cookie,/tapago_session_php=/);
  }
  await req(anon,'POST','/auth/login',{email:'a@example.test',password:'Senha incorreta 123'},401);
  await req(teacher,'POST','/students',{},403,{'X-Requested-With':''});
  await req(teacher,'GET','/students',undefined,403,{Origin:'https://evil.example'});
  await req(pupil,'GET','/students',undefined,403);
  const student=await req(teacher,'POST','/students',{name:'Aluno Sintético',startDate:'2026-10-01',mainGoal:'Mobilidade',weeklyFrequency:'3'},201);
  await req(other,'GET',`/students/${student.id}`,undefined,404);
  const invite=await req(teacher,'POST',`/students/${student.id}/invite`,{});
  await req(pupil,'POST','/me/claim',{code:invite.code});
  await req(pupil,'POST','/me/claim',{code:invite.code},400);
  assert.equal((await req(pupil,'GET','/me/students')).length,1);
  const ex=await req(teacher,'POST','/exercises',{name:'Alongamento',muscleGroup:'Peitoral',category:'Alongamento'},201);
  const exOther=await req(other,'POST','/exercises',{name:'Privado',muscleGroup:'Costas',category:'Musculação'},201);
  const planData={title:'Rotina teste',objective:'Mobilidade',difficulty:'Iniciante',startsAt:'2026-10-01',workouts:[{name:'Treino A',exercises:[{exerciseId:ex.id}]}]};
  const plan=await req(teacher,'POST',`/students/${student.id}/workout-plans`,planData,201);
  assert.equal((await req(pupil,'GET','/me/workout-plans')).length,0);
  await req(teacher,'PUT',`/workout-plans/${plan.id}`,{...planData,status:'ativo',revision:1,workouts:[{name:'Vazio',exercises:[]}]},400);
  await req(teacher,'PUT',`/workout-plans/${plan.id}`,{...planData,status:'ativo',revision:1,workouts:[{name:'Invasão',exercises:[{exerciseId:exOther.id}]}]},400);
  const published=await req(teacher,'PUT',`/workout-plans/${plan.id}`,{...planData,workouts:plan.workouts,status:'ativo',revision:1});
  assert.equal(published.revision,2);
  await req(teacher,'PUT',`/workout-plans/${plan.id}`,{...planData,status:'ativo',revision:1},409);
  const visible=await req(pupil,'GET','/me/workout-plans'); assert.equal(visible.length,1); assert.equal(visible[0].workouts.length,1);
  const wid=visible[0].workouts[0].id;
  const feedback={comment:'Concluído',requestId:'synthetic-feedback-0001'};
  const f=await req(pupil,'POST',`/me/workouts/${wid}/feedbacks`,feedback,201);
  assert.equal((await req(pupil,'POST',`/me/workouts/${wid}/feedbacks`,feedback,201)).id,f.id);
  const prepared=await req(teacher,'POST','/workout-templates',{name:'Modelo',exercises:[{exerciseId:ex.id}]},201);
  await req(other,'PUT',`/workout-templates/${prepared.id}`,prepared,404);
  await req(teacher,'POST','/prescription-presets',{name:'Alongar 20s',series:[{type:'repetitions-time',sets:1,repetitions:'1',durationSeconds:20}]},201);
  assert.equal((await req(teacher,'GET','/prescription-presets')).length,1);
  const program=await req(teacher,'POST','/programs',{name:'Programa',weeklyFrequency:3,cycleDays:30,workouts:[{name:'Treino',exercises:[{exerciseId:ex.id}]}]},201);
  assert.equal(program.workouts.length,1);
  const template=await req(teacher,'POST','/templates',{name:'Questionário teste',cycleDays:30,questions:[{dimension:'Geral',text:'Como está?',type:'text',required:true}]},201);
  const evaluationData={templateId:template.id,date:'2026-10-01',cycle:1,evaluator:'Professor teste',status:'rascunho',answers:[]};
  const evaluation=await req(teacher,'POST',`/students/${student.id}/evaluations`,evaluationData,201);
  await req(teacher,'PUT',`/students/${student.id}/evaluations/${evaluation.id}`,{...evaluationData,status:'concluida'},400);
  await req(pupil,'PUT',`/me/students/${student.id}/evaluations/${evaluation.id}`,{answers:[{questionId:template.questions[0].id,value:'Bem'}]});
  await req(teacher,'PUT',`/students/${student.id}/evaluations/${evaluation.id}`,{...evaluationData,status:'concluida',answers:[{questionId:template.questions[0].id,value:'Bem'}]});
  await req(teacher,'DELETE',`/students/${student.id}/evaluations/${evaluation.id}`,undefined,409);
  const record=await req(teacher,'POST',`/students/${student.id}/records`,{kind:'note',date:'2026-10-01',data:{notes:'Evolução sintética'}},201);
  assert.equal(record.data.notes,'Evolução sintética');
  const edited=await req(teacher,'PUT',`/students/${student.id}/records/${record.id}`,{kind:'note',date:'2026-10-02',data:{notes:'Correção sintética'}});
  assert.equal(edited.data.notes,'Correção sintética');
  await req(teacher,'DELETE',`/students/${student.id}/records/${record.id}`);
  await req(pupil,'POST',`/me/students/${student.id}/records`,{kind:'note',date:'2026-10-01',data:{notes:'Bloqueado'}},404);
  const criteria=JSON.parse(fs.readFileSync('backend-php/generated/seed.json')).technicalCriteria;
  for(const [kind,data] of Object.entries({
    monthly:{cycle:1,planned:12,completed:10,rpe:5,cardioMinutes:30},
    physical:{weight:70,waist:null},
    training:{title:'Sessão',status:'realizado',focus:'Mobilidade',duration:30,rpe:4},
    technical:{criteria:criteria.map(criterion=>({criterion}))},
    social:{notes:'Registro social'},
  })) await req(teacher,'POST',`/students/${student.id}/records`,{kind,date:'2026-10-01',data},201);
  await req(teacher,'POST','/enrollment/link',{publicName:'Professor Teste',contact:'contato@example.test'},201);
  const link=await req(teacher,'GET','/enrollment/link'); assert.match(link.url,/\/tapago\/cadastro\//);
  const challenge=await req(anon,'GET','/public/enrollment/'+link.token);
  await new Promise(r=>setTimeout(r,2100));
  const enrollment={name:'Cadastro Sintético',email:'cadastro@example.test',phone:'41999990000',goals:['Hipertrofia'],practicing:'Não',daysPerWeek:3,previousTrainer:'Não',availability:'Manhã',health:{restrictions:'Sintética'},consent:true,healthConsent:true,policyVersion:challenge.policyVersion,challenge:challenge.challenge};
  await req(anon,'POST','/public/enrollment/'+link.token,enrollment,202);
  await req(anon,'POST','/public/enrollment/'+link.token,enrollment,400);
  const requests=await req(teacher,'GET','/enrollment/requests'); assert.equal(requests.length,1);
  await req(other,'GET','/enrollment/requests/'+requests[0].id,undefined,404);
  const detail=await req(teacher,'GET','/enrollment/requests/'+requests[0].id); assert.equal(detail.form.health.restrictions,'Sintética');
  // Node deve conseguir decifrar o payload PHP sem conversão da chave/formato.
  const stored=JSON.parse(run(['backend-php/tests/dump.php'],env));
  const [iv,tag,cipher]=stored.EnrollmentRequest[0].payload.split('.').map(x=>Buffer.from(x,'base64'));
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from('ab'.repeat(32),'hex'),iv); decipher.setAuthTag(tag);
  assert.equal(JSON.parse(Buffer.concat([decipher.update(cipher),decipher.final()]).toString()).email,enrollment.email);
  await req(teacher,'POST',`/enrollment/requests/${requests[0].id}/status`,{status:'active'});
  await req(teacher,'DELETE',`/enrollment/requests/${requests[0].id}`,undefined,409);
  for(const type of ['repetitions-load','repetitions-load-time','repetitions-time','time-incline','running','notes','cadence']){
    await req(teacher,'POST','/prescription-presets',{name:'Preset '+type,series:[{type,sets:2,repetitions:type.startsWith('repetitions')?'8-12':'',load:10,durationSeconds:20,restSeconds:60,incline:2,distance:100,speed:5,notes:'Teste',cadence:'2020'}]},201);
  }
  const grouped=await req(teacher,'POST','/workout-templates',{name:'Blocos',exercises:[{exerciseId:ex.id,clientId:'a',groupId:'g'},{exerciseId:ex.id,clientId:'b',groupId:'g'},{exerciseId:ex.id,clientId:'c'}]},201);
  await req(teacher,'PUT',`/workout-templates/${grouped.id}/order`,{revision:1,ids:['a','c','b']},400);
  await req(teacher,'PUT',`/workout-templates/${grouped.id}/order`,{revision:1,ids:['c','a','b']});
  await req(teacher,'PUT',`/workout-templates/${grouped.id}/order`,{revision:1,ids:['a','b','c']},409);
  await req(teacher,'DELETE',`/workout-templates/${grouped.id}`);
  await req(teacher,'PUT',`/programs/${program.id}`,{...program,revision:1,name:'Programa revisado'});
  await req(teacher,'DELETE',`/programs/${program.id}`);
  const temporary=await req(teacher,'POST','/students',{name:'Aluno temporário',startDate:'2026-10-01',mainGoal:'Mobilidade'},201);
  await req(teacher,'PUT',`/students/${temporary.id}`,{...temporary,name:'Aluno corrigido'});
  await req(teacher,'DELETE',`/students/${temporary.id}`);
  await req(teacher,'POST',`/students/${student.id}/revoke`,{});
  await req(teacher,'GET',`/students/${student.id}`,undefined,404);
  assert.equal((await req(pupil,'GET','/me/workout-plans')).length,1);
  await req(pupil,'POST',`/me/workouts/${wid}/feedbacks`,{...feedback,requestId:'synthetic-feedback-0002'},403);
  await req(pupil,'GET',`/me/students/${student.id}/export`);
  await req(pupil,'POST','/auth/logout',{});
  await req(pupil,'GET','/me/workout-plans',undefined,401);
  console.log(`${checks} verificações HTTP passaram. Banco sintético preservado: ${name}`);
  fs.writeFileSync('data/php-last-test-config.txt',config);
  const migration=spawnSync(process.execPath,['scripts/php/migration-test.mjs',config],{env,stdio:'inherit'});
  assert.equal(migration.status,0,'Migração sintética');
} finally { server.kill(); fs.closeSync(log); }
