import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { validateRelease } from './validate-release.mjs';
import { preparePwa } from './pwa.mjs';
import { archiveRelease } from './archive.mjs';

const root=path.resolve('data/php-release-'+randomBytes(6).toString('hex'));
const publicDir=path.join(root,'public_html','tapago');
const privateDir=path.join(root,'tapago-private');
fs.mkdirSync(publicDir,{recursive:true});
const result=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir',publicDir],{
  // O subdomínio já aponta para public_html/tapago. Pasta física não é prefixo de URL.
  stdio:'inherit',env:{...process.env,NODE_ENV:'production',EXPO_NO_DOTENV:'1',TAPAGO_WEB_BASE_PATH:'',EXPO_PUBLIC_PERSONAL_API_URL:'/'},
});
if(result.status!==0) process.exit(result.status||1);
await preparePwa(publicDir);
// Lista positiva: nenhum banco, senha, dependência Node ou configuração real entra no pacote.
for(const file of ['bootstrap.php','src','generated']) {
  fs.cpSync(path.join('backend-php',file),path.join(privateDir,file),{recursive:true});
}
fs.copyFileSync('backend-php/public/.htaccess',path.join(publicDir,'.htaccess'));
fs.cpSync('backend-php/public/api',path.join(publicDir,'api'),{recursive:true});
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isDirectory())walk(full);
  else {
    const relative=path.relative(root,full).replaceAll('\\','/');
    const expoAsset=relative.startsWith('public_html/tapago/assets/node_modules/') && /\.(?:png|jpg|jpeg|webp|gif|svg|ttf|otf|woff2?)$/.test(relative);
    if(!expoAsset && /(?:^|\/)(?:node_modules|\.git|\.env|config\.php)(?:\/|$)|\.(?:db|sqlite|map|key|pem|bak)$/.test(relative))throw new Error('Arquivo proibido: '+relative);
    files.push({path:relative,sha256:createHash('sha256').update(fs.readFileSync(full)).digest('hex')});
  }
}}
walk(root);
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({publicBasePath:'',publicDirectory:'public_html/tapago',privateDirectory:'tapago-private',files},null,2)+'\n');
validateRelease(root);
const archive=archiveRelease(root);
fs.writeFileSync('data/php-last-release.txt',root);
console.log(`Pacote local preparado (sem deploy): ${root}`);
console.log(`ZIP verificado por extração e hashes: ${archive}`);
