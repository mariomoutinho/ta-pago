/// <reference types="node" />
// Executado somente no desenvolvimento/CI. O servidor PHP usa os JSON versionados.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import * as validation from '../../shared/validation';
import * as workouts from '../../shared/workouts';
import { programRoutineSchema } from '../../shared/programs';
import { enrollmentSchema, policyVersion } from '../../shared/enrollment';
import { initialQuestions, technicalCriteria } from '../../shared/questionnaire';

mkdirSync('backend-php/generated', { recursive: true });
const schemas = { ...validation, ...workouts, programRoutineSchema, enrollmentSchema };
const contracts = Object.fromEntries(Object.entries(schemas).filter(([name, value]) => name.endsWith('Schema') && value instanceof z.ZodType)
  .map(([name, value]) => [name, z.toJSONSchema(value as z.ZodType, { io: 'input', unrepresentable: 'any', override: ({ zodSchema, jsonSchema }) => {
    const def = (zodSchema as any)._zod.def;
    if (def.type === 'number' && def.coerce) {
      Object.assign(jsonSchema, z.toJSONSchema(zodSchema as unknown as z.ZodType, { io: 'output' }), { 'x-coerce-number': true });
    }
  } })]));
const source = readFileSync('prisma/schema.prisma', 'utf8');
const models: Record<string, any> = {};
for (const [, name, body] of source.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
  const fields: Record<string, any> = {}, relations: any[] = [], unique: string[][] = [], indexes: string[][] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const compound = line.match(/^@@(unique|index)\(\[([^\]]+)\]/);
    if (compound) { (compound[1] === 'unique' ? unique : indexes).push(compound[2].split(',').map(x => x.trim())); continue; }
    const field = line.match(/^(\w+)\s+(\w+)(\?|\[\])?(.*)$/);
    if (!field) continue;
    const [, key, type, modifier, attributes] = field;
    if (!['String','Int','Float','Boolean','DateTime','Json'].includes(type)) {
      const rel = attributes.match(/fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\],\s*onDelete:\s*(\w+)/);
      if (rel) relations.push({ field: rel[1].trim(), target: type, reference: rel[2].trim(), onDelete: rel[3] });
      continue;
    }
    const defaultValue = attributes.match(/@default\(("(?:\\.|[^"\\])*"|\d+|true|false|now\(\)|cuid\(\))\)/)?.[1];
    fields[key] = { type, nullable: modifier === '?', id: attributes.includes('@id'), updatedAt: attributes.includes('@updatedAt') };
    if (defaultValue) fields[key].default = ['now()','cuid()'].includes(defaultValue) ? defaultValue : JSON.parse(defaultValue);
    if (attributes.includes('@unique')) unique.push([key]);
  }
  models[name] = { fields, relations, unique, indexes };
}
const tables: string[] = [], foreignKeys: string[] = [];
for (const [name, model] of Object.entries(models)) {
  const indexed = new Set([...model.unique.flat(), ...model.indexes.flat(), ...model.relations.map((r: any) => r.field), 'id']);
  const columns = Object.entries(model.fields).map(([key, f]: [string, any]) => {
    const type = f.type === 'String' ? (name === 'User' && key === 'email' ? 'VARCHAR(254)' : indexed.has(key) ? 'VARCHAR(191)' : 'LONGTEXT') :
      ({ Int:'INT', Float:'DOUBLE', Boolean:'TINYINT(1)', DateTime:'VARCHAR(24)', Json:'JSON' } as any)[f.type];
    return `  \`${key}\` ${type} ${f.nullable ? 'NULL' : 'NOT NULL'}${f.id ? ' PRIMARY KEY' : ''}`;
  });
  model.unique.forEach((keys: string[], i: number) => columns.push(`  UNIQUE KEY \`uq_${name}_${i}\` (${keys.map(k=>`\`${k}\``).join(',')})`));
  model.indexes.forEach((keys: string[], i: number) => columns.push(`  KEY \`ix_${name}_${i}\` (${keys.map(k=>`\`${k}\``).join(',')})`));
  tables.push(`CREATE TABLE \`${name}\` (\n${columns.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;`);
  for (const rel of model.relations) foreignKeys.push(`ALTER TABLE \`${name}\` ADD CONSTRAINT \`fk_${name}_${rel.field}\` FOREIGN KEY (\`${rel.field}\`) REFERENCES \`${rel.target}\` (\`${rel.reference}\`) ON DELETE ${rel.onDelete === 'SetNull' ? 'SET NULL' : rel.onDelete.toUpperCase()};`);
}
tables.push('CREATE TABLE `RateLimit` (`id` VARCHAR(64) PRIMARY KEY, `hits` INT NOT NULL, `expires` BIGINT NOT NULL) ENGINE=InnoDB;');
tables.push('CREATE TABLE `MigrationReceipt` (`id` VARCHAR(64) PRIMARY KEY, `createdAt` VARCHAR(24) NOT NULL) ENGINE=InnoDB;');
writeFileSync('backend-php/schema.sql', '-- Gerado por scripts/php/generate.ts; MySQL 8 / MariaDB 10.4+.\n' + [...tables,...foreignKeys].join('\n\n') + '\n');
for (const [file, value] of Object.entries({ contracts, models, seed: { initialQuestions, technicalCriteria, policyVersion } })) {
  writeFileSync(`backend-php/generated/${file}.json`, JSON.stringify(value, null, 2) + '\n');
}
console.log(`${Object.keys(models).length} tabelas e ${Object.keys(contracts).length} contratos gerados; refinamentos de domínio são explícitos no PHP.`);
