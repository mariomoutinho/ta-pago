import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

const php=process.env.PHP_BIN||'php';
const run=(args,env=process.env,ok=true)=>{
  const r=spawnSync(php,args,{env,encoding:'utf8'});
  if(ok)assert.equal(r.status,0,r.stdout+r.stderr); else assert.notEqual(r.status,0);
  return r.stdout.trim();
};
const sourceConfig=process.argv[2];
if(!sourceConfig)throw new Error('Informe configuração do banco SINTÉTICO criado por test.mjs');
const tables=JSON.parse(run(['backend-php/tests/dump.php'],{...process.env,TAPAGO_CONFIG:sourceConfig}));
const models=JSON.parse(fs.readFileSync('backend-php/generated/models.json'));
const id=randomBytes(6).toString('hex'),source=`data/migration-${id}.db`,bundle=`data/migration-${id}.json`;
const db=new Database(source);
for(const [table,model] of Object.entries(models)){
  const fields=Object.keys(model.fields);
  db.exec(`CREATE TABLE "${table}" (${fields.map(f=>`"${f}"`).join(',')})`);
  const insert=db.prepare(`INSERT INTO "${table}" VALUES (${fields.map(()=>'?').join(',')})`);
  for(const row of tables[table])insert.run(fields.map(key=>{
    const value=row[key],type=model.fields[key].type;
    if(value===null)return null;
    if(type==='DateTime')return Date.parse(value);
    if(type==='Json')return JSON.stringify(value);
    if(type==='Boolean')return Number(value);
    return value;
  }));
}
db.close();
const before=createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const exported=spawnSync(process.execPath,['scripts/php/export-sqlite.mjs',source,bundle],{encoding:'utf8'});
assert.equal(exported.status,0,exported.stderr);
assert.equal(createHash('sha256').update(fs.readFileSync(source)).digest('hex'),before,'Origem alterada');
const config=run(['backend-php/tests/setup.php','tapago_test_migration_'+id]);
const env={...process.env,TAPAGO_CONFIG:config};
run(['backend-php/bin/console.php','schema','--apply'],env);
run(['backend-php/bin/console.php','import',bundle],env);
const empty=JSON.parse(run(['backend-php/tests/dump.php'],env));
assert.ok(Object.values(empty).every(rows=>rows.length===0),'Simulação escreveu dados');
run(['backend-php/bin/console.php','import',bundle,'--apply'],env);
run(['backend-php/bin/console.php','verify',bundle],env);
run(['backend-php/bin/console.php','import',bundle,'--apply'],env,false);
const imported=JSON.parse(run(['backend-php/tests/dump.php'],env));
for(const table of ['Session','Invitation','EnrollmentChallenge'])assert.equal(imported[table].length,0);
// Corrupção da transferência precisa ser detectada antes de escrever.
const envelope=JSON.parse(fs.readFileSync(bundle)); envelope.payload+=' ';
const corrupt=`data/migration-${id}-corrupt.json`; fs.writeFileSync(corrupt,JSON.stringify(envelope));
run(['backend-php/bin/console.php','import',corrupt,'--apply'],env,false);
const sql=`data/migration-${id}.sql`;
const sqlExport=spawnSync(process.execPath,['scripts/php/export-sql.mjs',bundle,sql],{encoding:'utf8'});
assert.equal(sqlExport.status,0,sqlExport.stderr);
const sqlConfig=run(['backend-php/tests/setup.php','tapago_test_sql_'+id]);
const sqlEnv={...process.env,TAPAGO_CONFIG:sqlConfig};
run(['backend-php/tests/sql-import.php',sql],sqlEnv);
run(['backend-php/bin/console.php','verify',bundle],sqlEnv);
// Uma FK inválida deve reverter inclusive as linhas anteriores na importação PDO.
const rollbackConfig=run(['backend-php/tests/setup.php','tapago_test_rollback_'+id]);
const rollbackEnv={...process.env,TAPAGO_CONFIG:rollbackConfig};
run(['backend-php/bin/console.php','schema','--apply'],rollbackEnv);
const invalidBundle=JSON.parse(JSON.parse(fs.readFileSync(bundle)).payload);
invalidBundle.tables.Student[0].personalId='nao-existe';
const payload=JSON.stringify(invalidBundle), invalid=`data/migration-${id}-invalid.json`;
fs.writeFileSync(invalid,JSON.stringify({payload,sha256:createHash('sha256').update(payload).digest('hex')}));
run(['backend-php/bin/console.php','import',invalid,'--apply'],rollbackEnv,false);
assert.ok(Object.values(JSON.parse(run(['backend-php/tests/dump.php'],rollbackEnv))).every(rows=>rows.length===0),'Rollback incompleto');
console.log('Migração sintética: origem intacta; simulação; importação PDO e SQL; comparação de 20 tabelas; rollback de FK, repetição e corrupção conferidos.');
