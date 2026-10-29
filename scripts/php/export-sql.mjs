import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Uso: node scripts/php/export-sql.mjs data/snapshot.json data/importacao.sql');
const target=path.resolve(output);
if(!target.startsWith(path.resolve('data')+path.sep)||path.extname(target)!=='.sql')throw new Error('Destino obrigatório: data/*.sql');
const envelope=JSON.parse(fs.readFileSync(input));
if(createHash('sha256').update(envelope.payload).digest('hex')!==envelope.sha256)throw new Error('Checksum inválido');
const bundle=JSON.parse(envelope.payload), rawModels=fs.readFileSync('backend-php/generated/models.json');
if(bundle.format!==1||createHash('sha256').update(rawModels).digest('hex')!==bundle.schemaHash)throw new Error('Contrato incompatível');
const models=JSON.parse(rawModels),expected=Object.keys(models).filter(t=>!['Session','Invitation','EnrollmentChallenge'].includes(t));
if(expected.sort().join()!==Object.keys(bundle.tables).sort().join())throw new Error('Tabelas incompatíveis');
const ordered=[];
while(ordered.length<expected.length){
  const next=expected.find(t=>!ordered.includes(t)&&models[t].relations.every(r=>ordered.includes(r.target)));
  if(!next)throw new Error('Dependência circular'); ordered.push(next);
}
const literal=(v,type)=>{
  if(v===null)return 'NULL';
  if(type==='Boolean')return v?'1':'0';
  if(['Int','Float'].includes(type)){if(typeof v!=='number'||!Number.isFinite(v))throw new Error('Número inválido');return String(v);}
  const text=type==='Json'?JSON.stringify(v):v;
  if(typeof text!=='string')throw new Error('Texto inválido');
  return `CONVERT(X'${Buffer.from(text).toString('hex')}' USING utf8mb4)`;
};
const lines=[
  '-- DADOS PRIVADOS. Nunca colocar em public_html, Git ou artifacts do GitHub.',
  '-- Importar APENAS em banco NOVO vazio. Parar no primeiro erro; abandonar o destino se houver erro.',
  '-- Conferir contagens/dados antes de apontar a aplicação. Não executar em produção ativa.',
  `-- Snapshot SHA-256: ${envelope.sha256}`,
  fs.readFileSync('backend-php/schema.sql','utf8'),
  "SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';",
  "SET NAMES utf8mb4;",'START TRANSACTION;',
];
for(const table of ordered)for(const row of bundle.tables[table]){
  const keys=Object.keys(models[table].fields);
  if(keys.sort().join()!==Object.keys(row).sort().join())throw new Error('Campos incompatíveis');
  lines.push(`INSERT INTO \`${table}\` (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(k=>literal(row[k],models[table].fields[k].type)).join(',')});`);
}
lines.push(`INSERT INTO MigrationReceipt(id,createdAt) VALUES ('${envelope.sha256}','${new Date().toISOString()}');`,'COMMIT;');
for(const table of ordered)lines.push(`SELECT '${table}' AS tabela, COUNT(*) AS total, ${bundle.tables[table].length} AS esperado FROM \`${table}\`;`);
fs.writeFileSync(target,lines.join('\n')+'\n',{flag:'wx',mode:0o600});
console.log('SQL privado gerado para banco vazio. Nenhum banco foi alterado.');
