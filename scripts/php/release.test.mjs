import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRelease } from './validate-release.mjs';

const release=fs.readFileSync('data/php-last-release.txt','utf8').trim();
function fixture(){
  const dir=fs.mkdtempSync(path.resolve('data/release-test-'));
  fs.cpSync(release,dir,{recursive:true});
  return dir;
}
function replace(dir,relative,change){
  const file=path.join(dir,relative);
  fs.writeFileSync(file,change(fs.readFileSync(file,'utf8')));
  const manifestFile=path.join(dir,'manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile));
  manifest.files.find(f=>f.path===relative).sha256=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest));
}
test('pacote real aceita todos os arquivos esperados',()=>assert.ok(validateRelease(release).files>0));
test('rejeita config.php privado mesmo fora da pasta pública',()=>{
  const dir=fixture();fs.writeFileSync(path.join(dir,'tapago-private/config.php'),'<?php return [];');
  assert.throws(()=>validateRelease(dir),/Arquivo não autorizado/);
});
test('rejeita SQL de inicialização no pacote de atualização',()=>{
  const dir=fixture();fs.writeFileSync(path.join(dir,'tapago-private/schema.sql'),'CREATE TABLE example (id INT);');
  assert.throws(()=>validateRelease(dir),/Arquivo não autorizado/);
});
test('detecta corrupção de bytes depois do build',()=>{
  const dir=fixture();fs.appendFileSync(path.join(dir,'public_html/tapago/index.html'),' ');
  assert.throws(()=>validateRelease(dir),/Hash divergente/);
});
test('rejeita regressão /tapago mesmo com hash recalculado',()=>{
  const dir=fixture();replace(dir,'public_html/tapago/index.html',s=>s.replace('/_expo/','/tapago/_expo/'));
  assert.throws(()=>validateRelease(dir),/Prefixo público antigo/);
});
test('rejeita PWA com início em subpasta',()=>{
  const dir=fixture();replace(dir,'public_html/tapago/manifest.webmanifest',s=>JSON.stringify({...JSON.parse(s),start_url:'/tapago/'}));
  assert.throws(()=>validateRelease(dir),/Manifesto PWA incompatível/);
});
