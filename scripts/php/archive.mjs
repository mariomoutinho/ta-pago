import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateRelease } from './validate-release.mjs';

// Ferramentas locais/CI: .NET no Windows; zip/unzip no Linux. Nada roda na hospedagem.
export function archiveRelease(root) {
  validateRelease(root);
  const archive=root+'.zip', extracted=root+'-zip-check';
  if(fs.existsSync(archive)||fs.existsSync(extracted))throw new Error('Não sobrescrever pacote existente');
  const run=(cmd,args,options={})=>{
    const result=spawnSync(cmd,args,{stdio:'inherit',windowsHide:true,...options});
    if(result.error)throw result.error;
    if(result.status!==0)throw new Error('Falha ao compactar/verificar ZIP: '+cmd);
  };
  if(process.platform==='win32'){
    run('powershell.exe',['-NoProfile','-NonInteractive','-Command',
      // CreateFromDirectory no .NET Framework antigo grava barras Windows no ZIP.
      "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
      "$zip=[System.IO.Compression.ZipFile]::Open($env:TAPAGO_ARCHIVE_OUTPUT,[System.IO.Compression.ZipArchiveMode]::Create); " +
      "try { foreach($item in Get-ChildItem -LiteralPath $env:TAPAGO_ARCHIVE_SOURCE -File -Recurse -Force) { " +
      "$relative=$item.FullName.Substring($env:TAPAGO_ARCHIVE_SOURCE.Length+1).Replace('\\','/'); " +
      "[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$item.FullName,$relative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null " +
      "} } finally { $zip.Dispose() }; " +
      "$zip=[System.IO.Compression.ZipFile]::OpenRead($env:TAPAGO_ARCHIVE_OUTPUT); " +
      "try { foreach($entry in $zip.Entries) { if($entry.FullName.Contains('\\')) { throw 'Separador Windows no ZIP' } } } finally { $zip.Dispose() }; " +
      "[System.IO.Compression.ZipFile]::ExtractToDirectory($env:TAPAGO_ARCHIVE_OUTPUT,$env:TAPAGO_ARCHIVE_CHECK)"],
    {env:{...process.env,TAPAGO_ARCHIVE_SOURCE:root,TAPAGO_ARCHIVE_OUTPUT:archive,TAPAGO_ARCHIVE_CHECK:extracted}});
  }else{
    run('zip',['-q','-r',archive,'.'],{cwd:root});
    run('unzip',['-tq',archive]);
    run('unzip',['-q',archive,'-d',extracted]);
  }
  // Compara todos os arquivos descompactados com os hashes e a lista positiva.
  validateRelease(extracted);
  const checksum=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  fs.writeFileSync(archive+'.sha256',checksum+'  '+path.basename(archive)+'\n');
  fs.writeFileSync('data/php-last-archive.txt',archive);
  return archive;
}
