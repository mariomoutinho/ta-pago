// Teste opcional do .htaccess real com Apache/FastCGI local. Nunca usa produção.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const apacheRoot=process.env.TAPAGO_TEST_APACHE_ROOT;
const cgi=process.env.PHP_CGI_BIN;
if(!apacheRoot||!cgi)throw new Error('Defina TAPAGO_TEST_APACHE_ROOT e PHP_CGI_BIN com instalações locais.');
const release=fs.readFileSync('data/php-last-release.txt','utf8').trim();
const config=fs.readFileSync('data/php-last-test-config.txt','utf8').trim();
const dir=path.resolve('data/apache-test-'+randomBytes(6).toString('hex')); fs.mkdirSync(dir);
const quote=p=>'"'+p.replaceAll('\\','/').replaceAll('"','')+'"';
const modules=['authz_core','authz_host','dir','mime','rewrite','headers','proxy','proxy_fcgi'];
const conf=[
  'ServerRoot '+quote(apacheRoot),
  'Listen 127.0.0.1:33317', 'ServerName 127.0.0.1',
  'PidFile '+quote(path.join(dir,'httpd.pid')), 'ErrorLog '+quote(path.join(dir,'error.log')),
  ...modules.map(m=>`LoadModule ${m}_module modules/mod_${m}.so`),
  'TypesConfig '+quote(path.join(apacheRoot,'conf/mime.types')),
  'DocumentRoot '+quote(path.join(release,'public_html/tapago')),
  '<Directory '+quote(path.join(release,'public_html/tapago'))+'>',
  'AllowOverride All','Options +FollowSymLinks','Require all granted','</Directory>',
  'ProxyFCGIBackendType GENERIC', '<FilesMatch "\\.php$">',
  'ProxyFCGISetEnvIf "true" SCRIPT_FILENAME '+quote(path.join(release,'public_html/tapago/api/index.php')),
  'SetHandler "proxy:fcgi://127.0.0.1:33319/"', '</FilesMatch>',
].join('\n');
const confFile=path.join(dir,'httpd.conf'); fs.writeFileSync(confFile,conf);
const httpd=path.join(apacheRoot,'bin',process.platform==='win32'?'httpd.exe':'httpd');
const check=spawnSync(httpd,['-t','-f',confFile],{encoding:'utf8'});
assert.equal(check.status,0,check.stderr);
const log=fs.openSync(path.join(dir,'process.log'),'w');
const env={...process.env,TAPAGO_CONFIG:config,PHP_FCGI_MAX_REQUESTS:'0'};
// Sem override do diretório privado: testa também a resolução no pacote gerado.
delete env.TAPAGO_PRIVATE_DIR;
const php=spawn(cgi,['-d','cgi.force_redirect=0','-b','127.0.0.1:33319'],{env,windowsHide:true,stdio:['ignore',log,log]});
const apache=spawn(httpd,['-X','-f',confFile],{env,windowsHide:true,stdio:['ignore',log,log]});
try {
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/php/browser-test.mjs'],{env:{...env,PHP_BROWSER_EXTERNAL:'1'},stdio:'inherit',windowsHide:true});
    child.on('error',reject); child.on('exit',resolve);
  });
  assert.equal(result,0,'Teste Apache/FastCGI falhou. Consulte os logs privados de teste.');
  console.log('Apache: .htaccess, front controller PHP e assets do pacote validados na raiz.');
} finally {apache.kill();php.kill();fs.closeSync(log);}
