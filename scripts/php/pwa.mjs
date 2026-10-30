import fs from 'node:fs';
import path from 'node:path';
import { generateImageAsync } from '@expo/image-utils';

// Somente exportação web para PHP. Nenhum service worker ou cache de dados privados.
export async function preparePwa(publicDir) {
  const iconsDir=path.join(publicDir,'assets/pwa');
  fs.mkdirSync(iconsDir,{recursive:true});
  for(const size of [180,192,512]){
    const {source}=await generateImageAsync({projectRoot:process.cwd(),cacheType:'tapago-pwa'}, {
      src:'logotapago.png',width:size,height:size,resizeMode:'contain',backgroundColor:'#000000',removeTransparency:true,
    });
    fs.writeFileSync(path.join(iconsDir,`icon-${size}.png`),source);
  }
  const manifest={id:'/',name:'Tá Pago',short_name:'Tá Pago',lang:'pt-BR',start_url:'/',scope:'/',display:'standalone',background_color:'#000000',theme_color:'#000000',icons:[192,512].map(size=>({src:`/assets/pwa/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}))};
  fs.writeFileSync(path.join(publicDir,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
  const file=path.join(publicDir,'index.html');
  const html=fs.readFileSync(file,'utf8');
  if(!html.includes('</head>') || html.includes('rel="manifest"'))throw new Error('HTML Expo incompatível com geração PWA');
  const meta=[
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<meta name="theme-color" content="#000000" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-title" content="Tá Pago" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/assets/pwa/icon-180.png" />',
  ].join('\n');
  fs.writeFileSync(file,html.replace(/<html\b[^>]*>/,'<html lang="pt-BR">').replace('</head>',meta+'\n</head>'));
}
