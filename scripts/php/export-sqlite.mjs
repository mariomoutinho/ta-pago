import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

// Executar localmente. Não altera o SQLite e não acessa serviços externos.
const [source, output] = process.argv.slice(2);
if (!source) throw new Error('Uso: node scripts/php/export-sqlite.mjs origem.db [data/exportacao.json]');
const modelsFile = fs.readFileSync('backend-php/generated/models.json');
const models = JSON.parse(modelsFile);
const excluded = ['Session', 'Invitation', 'EnrollmentChallenge'];
const db = new Database(source, { readonly: true, fileMustExist: true });
const tables = {};
db.exec('BEGIN');
try {
  for (const [table, model] of Object.entries(models)) {
    if (excluded.includes(table)) continue;
    tables[table] = db.prepare(`SELECT * FROM "${table}" ORDER BY id`).all().map(row => {
      for (const [key, field] of Object.entries(model.fields)) {
        if (!(key in row)) throw new Error(`Campo ausente: ${table}.${key}`);
        if (row[key] === null) continue;
        if (field.type === 'DateTime') row[key] = new Date(row[key]).toISOString();
        if (field.type === 'Boolean') row[key] = Boolean(row[key]);
        if (field.type === 'Json' && typeof row[key] === 'string') row[key] = JSON.parse(row[key]);
      }
      return row;
    });
    console.log(`${table}: ${tables[table].length}`);
  }
} finally { db.exec('ROLLBACK'); db.close(); }
const emails = tables.User.map(u => u.email.trim().toLowerCase());
if (new Set(emails).size !== emails.length || tables.User.some((u,i) => u.email !== emails[i])) throw new Error('E-mails precisam de revisão antes da migração; origem não alterada.');
const payload = JSON.stringify({ format: 1, schemaHash: crypto.createHash('sha256').update(modelsFile).digest('hex'), excluded, tables });
if (output) {
  const target = path.resolve(output), root = path.resolve('data') + path.sep;
  if (!target.startsWith(root) || path.extname(target) !== '.json') throw new Error('Salve somente em data/*.json (fora do Git e da pasta pública).');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({ sha256: crypto.createHash('sha256').update(payload).digest('hex'), payload }), { flag: 'wx', mode: 0o600 });
  console.log('Snapshot gravado. Contém dados pessoais; mantenha privado.');
} else console.log('Simulação concluída; nenhum arquivo gravado.');
