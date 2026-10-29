import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
let count=0;
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isDirectory())walk(full);
  else if(item.name.endsWith('.php')&&item.name!=='config.php'){
    const r=spawnSync(process.env.PHP_BIN||'php',['-l',full],{encoding:'utf8'});
    if(r.status!==0)throw new Error(r.stdout+r.stderr);count++;
  }
}}
walk('backend-php');console.log(`${count} arquivos PHP com sintaxe válida.`);
