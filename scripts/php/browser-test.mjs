import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateRelease } from './validate-release.mjs';
const release=fs.readFileSync('data/php-last-release.txt','utf8').trim();
validateRelease(release);
const config=fs.readFileSync('data/php-last-test-config.txt','utf8').trim();
const log=fs.openSync('data/php-browser.log','w');
const server=process.env.PHP_BROWSER_EXTERNAL==='1'?null:spawn(process.env.PHP_BIN||'php',['-S','127.0.0.1:33317','backend-php/tests/router.php'],{windowsHide:true,stdio:['ignore',log,log],env:{...process.env,TAPAGO_CONFIG:config,TAPAGO_PRIVATE_DIR:path.join(release,'tapago-private'),TAPAGO_TEST_WEB:path.join(release,'public_html','tapago')}});
let browser;
try {
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:33317/api/health');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  const health=await fetch('http://127.0.0.1:33317/api/health');
  assert.equal(health.status,200,await health.clone().text()); assert.match(health.headers.get('content-type'),/application\/json/);
  assert.deepEqual(await health.json(),{status:'ok'});
  const manifest=JSON.parse(fs.readFileSync(path.join(release,'manifest.json')));
  const assets=manifest.files.filter(f=>f.path.startsWith('public_html/tapago/') && !f.path.endsWith('/.htaccess') && !f.path.endsWith('.php'));
  for(const asset of assets){
    const url='http://127.0.0.1:33317/'+asset.path.slice('public_html/tapago/'.length);
    const response=await fetch(url);
    assert.equal(response.status,200,url);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,url);
    if(/\.(css|js|png)$/.test(url))assert.match(response.headers.get('content-type'),url.endsWith('.css')?/text\/css/:url.endsWith('.js')?/(?:text|application)\/javascript/:/image\/png/);
    if(url.endsWith('.webmanifest'))assert.match(response.headers.get('content-type'),/application\/manifest\+json/);
  }
  for(const blocked of ['/.env','/config.php','/tapago-private/config.php','/data/backup.sql'])assert.equal((await fetch('http://127.0.0.1:33317'+blocked)).status,403,blocked);
  assert.equal((await fetch('http://127.0.0.1:33317/_expo/missing.js')).status,404);
  const unknown=await fetch('http://127.0.0.1:33317/api/unknown');
  assert.ok([401,404].includes(unknown.status)); assert.match(unknown.headers.get('content-type'),/application\/json/);
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  for(const width of [390,1280]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage(); const errors=[]; const requests=[]; const failures=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
    page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:33317/') && r.status()>=400)failures.push([r.status(),r.url()]);});
    assert.equal((await page.goto('http://127.0.0.1:33317/')).status(),200);
    await page.getByLabel('E-mail',{exact:true}).waitFor();
    assert.equal(new URL(page.url()).pathname,'/entrar');
    const cdp=await context.newCDPSession(page);
    const pwa=await cdp.send('Page.getAppManifest');
    assert.deepEqual(pwa.errors,[],'Manifesto rejeitado pelo Chromium');
    assert.equal(new URL(pwa.url).pathname,'/manifest.webmanifest');
    assert.equal(JSON.parse(pwa.data).display,'standalone');
    assert.equal(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content'),'yes');
    assert.equal(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length),0);
    assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
    await cdp.detach();
    assert.equal((await page.goto('http://127.0.0.1:33317/entrar')).status(),200);
    await page.getByLabel('E-mail',{exact:true}).fill('a@example.test');
    await page.getByLabel('Senha',{exact:true}).fill('Senha somente teste 123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.getByRole('button',{name:'Sair',exact:true}).waitFor();
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal((await context.cookies()).find(c=>c.name==='tapago_session_php').path,'/');
    await page.goto('http://127.0.0.1:33317/treinos-preparados');
    await page.getByRole('button',{name:'+ Criar treino preparado',exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'+ Criar treino preparado',exact:true}).waitFor();
    assert.equal(new URL(page.url()).pathname,'/treinos-preparados');
    // Escritas exclusivamente no banco sintético local, com a sessão do navegador.
    const api=async(method,route,data,status=200)=>{
      const response=await context.request.fetch('http://127.0.0.1:33317/api'+route,{method,data,headers:{'X-Requested-With':'TaPago'}});
      assert.equal(response.status(),status,await response.text());
      return response.json();
    };
    const student=await api('POST','/students',{name:`Aluno navegador ${width}`,startDate:'2026-10-01',mainGoal:'Mobilidade'},201);
    const exercise=await api('POST','/exercises',{name:`Exercício navegador ${width}`,muscleGroup:'Peitoral',category:'Alongamento'},201);
    const planData={title:`Rotina navegador ${width}`,objective:'Mobilidade',difficulty:'Iniciante',startsAt:'2026-10-01',workouts:[{name:'Treino A',exercises:[{exerciseId:exercise.id}]}]};
    const plan=await api('POST',`/students/${student.id}/workout-plans`,planData,201);
    await api('PUT',`/workout-plans/${plan.id}`,{...planData,workouts:plan.workouts,status:'ativo',revision:1});
    await page.goto(`http://127.0.0.1:33317/alunos/${student.id}/treinos`);
    await page.getByText(planData.title,{exact:true}).waitFor();
    await page.reload();
    await page.getByText(planData.title,{exact:true}).waitFor();
    const persisted=await api('GET',`/students/${student.id}/workout-plans`);
    assert.equal(persisted.find(p=>p.id===plan.id).status,'ativo');
    assert.equal(persisted.find(p=>p.id===plan.id).workouts.length,1);
    assert.ok(requests.length>0 && requests.every(url=>new URL(url).pathname.startsWith('/api/')),'API fora da raiz');
    assert.deepEqual(errors,[]);
    assert.deepEqual(failures,[],'Resposta HTTP inválida durante navegação');
    await page.screenshot({path:`data/php-browser-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Sair',exact:true}).click();
    await page.getByRole('button',{name:'Entrar',exact:true}).waitFor();
    await context.close();
  }
  console.log(`Expo Web + PHP: /, /entrar, /api/health, sessão, aluno/treino publicado persistindo após recarga, logout, manifesto PWA sem SW/cache e ${assets.length} arquivos públicos passaram em 390px e 1280px.`);
} finally {await browser?.close();server?.kill();fs.closeSync(log);}
