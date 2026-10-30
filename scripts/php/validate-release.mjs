import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function validateRelease(root) {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  if(manifest.publicBasePath!=='' || manifest.publicDirectory!=='public_html/tapago' || manifest.privateDirectory!=='tapago-private')throw new Error('Destino incompatível com a raiz do subdomínio');
  const expected=new Map(manifest.files.map(f=>[f.path,f.sha256]));
  if(expected.size!==manifest.files.length)throw new Error('Manifesto duplicado');
  const publicPrefix=manifest.publicDirectory+'/';
  let count=0;
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,item.name), relative=path.relative(root,full).replaceAll('\\','/');
    if(item.isSymbolicLink())throw new Error('Link simbólico no pacote');
    if(item.isDirectory()){walk(full);continue;}
    if(relative==='manifest.json')continue;
    const isPublic=relative.startsWith(publicPrefix);
    const local=isPublic?relative.slice(publicPrefix.length):relative;
    const allowed=isPublic ? local==='api/index.php' || local==='.htaccess' || /^(?:index\.html|metadata\.json|manifest\.webmanifest|favicon\.ico)$/.test(local) || /^(?:assets|_expo)\/.+\.(?:js|css|png|jpe?g|gif|webp|svg|ico|ttf|otf|woff2?)$/.test(local)
      : /^tapago-private\/(?:bootstrap\.php|src\/[A-Za-z]+\.php|generated\/(?:contracts|models|seed)\.json)$/.test(relative);
    if(!allowed || /(?:^|\/)config\.php$|\.env(?:\.|$)|\.(?:sql|db|sqlite|key|pem|map|bak|zip)$/i.test(relative))throw new Error('Arquivo não autorizado: '+relative);
    const bytes=fs.readFileSync(full);
    if(createHash('sha256').update(bytes).digest('hex')!==expected.get(relative))throw new Error('Hash divergente: '+relative);
    if(isPublic && /\.(?:html|js|css)$/.test(relative)){
      const text=bytes.toString('utf8');
      if(/\/tapago\/(?:api|_expo|assets|entrar|treinos)/.test(text))throw new Error('Prefixo público antigo: '+relative);
      if(/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:ghp_|sk_live_)[a-zA-Z0-9]{20,}/.test(text))throw new Error('Possível segredo no pacote');
    }
    expected.delete(relative); count++;
  }}
  walk(root);
  if(expected.size)throw new Error('Arquivo do manifesto ausente');
  const publicDir=path.join(root,manifest.publicDirectory);
  const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
  if(!html.includes('/_expo/'))throw new Error('Assets Expo não referenciados na raiz');
  const pwa=JSON.parse(fs.readFileSync(path.join(publicDir,'manifest.webmanifest')));
  if(pwa.name!=='Tá Pago'||pwa.short_name!=='Tá Pago'||pwa.start_url!=='/'||pwa.scope!=='/'||pwa.display!=='standalone')throw new Error('Manifesto PWA incompatível');
  for(const size of [180,192,512]){
    const png=fs.readFileSync(path.join(publicDir,`assets/pwa/icon-${size}.png`));
    if(png.toString('hex',0,8)!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==size||png.readUInt32BE(20)!==size)throw new Error('Dimensão de ícone PWA inválida');
    if(size!==180 && !pwa.icons.some(i=>i.src===`/assets/pwa/icon-${size}.png`&&i.sizes===`${size}x${size}`&&i.type==='image/png'))throw new Error('Ícone ausente do manifesto');
  }
  if(!html.includes('rel="manifest" href="/manifest.webmanifest"')||!html.includes('name="apple-mobile-web-app-capable" content="yes"'))throw new Error('Metadados PWA ausentes');
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    const url=match[1];
    if(!url.startsWith('/') || url.startsWith('//') || url.includes('..'))throw new Error('Asset HTML fora da raiz: '+url);
    if(!fs.statSync(path.join(publicDir,decodeURIComponent(url.split('?')[0]))).isFile())throw new Error('Asset HTML ausente');
  }
  const htaccess=fs.readFileSync(path.join(publicDir,'.htaccess'),'utf8');
  if(!/^RewriteBase \/\s*$/m.test(htaccess) || /RewriteBase \/tapago/.test(htaccess))throw new Error('RewriteBase incorreta');
  return {files:count,publicBasePath:''};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const root=process.argv[2]||fs.readFileSync('data/php-last-release.txt','utf8').trim();
  console.log('Pacote validado:',validateRelease(root));
}
