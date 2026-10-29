import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const release=fs.readFileSync('data/php-last-release.txt','utf8').trim();
const config=fs.readFileSync('data/php-last-test-config.txt','utf8').trim();
const log=fs.openSync('data/php-browser.log','w');
const server=spawn(process.env.PHP_BIN||'php',['-S','127.0.0.1:33317','backend-php/tests/router.php'],{windowsHide:true,stdio:['ignore',log,log],env:{...process.env,TAPAGO_CONFIG:config,TAPAGO_PRIVATE_DIR:path.resolve('backend-php'),TAPAGO_TEST_WEB:path.join(release,'public_html','tapago')}});
let browser;
try {
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:33317/tapago/api/health');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  for(const width of [390,1280]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage(); const errors=[]; const requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
    await page.goto('http://127.0.0.1:33317/tapago/');
    await page.getByLabel('E-mail',{exact:true}).fill('a@example.test');
    await page.getByLabel('Senha',{exact:true}).fill('Senha somente teste 123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.getByRole('button',{name:'Sair',exact:true}).waitFor();
    await page.goto('http://127.0.0.1:33317/tapago/treinos-preparados');
    await page.getByRole('button',{name:'+ Criar treino preparado',exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'+ Criar treino preparado',exact:true}).waitFor();
    assert.ok(requests.length>0 && requests.every(url=>url.includes('/tapago/api/')),'API fora da subpasta');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`data/php-browser-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Sair',exact:true}).click();
    await page.getByRole('button',{name:'Entrar',exact:true}).waitFor();
    await context.close();
  }
  console.log('Expo Web + PHP: login, página protegida, recarga em /tapago e logout passaram em 390px e 1280px.');
} finally {await browser?.close();server.kill();fs.closeSync(log);}
