import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, MANIFEST, collect, serialize, incrementalPlan, validateManifest } from './lib.mjs';

import { buildKnowledge as buildManifest } from '../knowledge/catalog.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  if (command !== 'plan' && args.length) throw new Error('Argumentos inesperados');
  if (command === 'validate') {
    console.log(`${collect().length} documentos válidos.`);
  } else if (command === 'build') {
    const manifest = validateManifest(buildManifest());
    writeFileSync(resolve(ROOT, MANIFEST), serialize(manifest));
    console.log(`${manifest.documents.length} documentos, ${manifest.code_entities.length} entidades de código, ${manifest.symbol_relations.length} relações e ${manifest.chunks.length} chunks; manifesto consolidado gerado localmente.`);
  } else if (command === 'check') {
    const expected = serialize(validateManifest(buildManifest()));
    const actual = readFileSync(resolve(ROOT, MANIFEST), 'utf8');
    if (actual !== expected) throw new Error('Manifesto desatualizado. Execute npm run knowledge:build.');
    console.log('Manifesto atualizado. Nenhuma ingestão externa realizada.');
  } else if (command === 'plan') {
    if (args.length !== 2 || args[0] !== '--baseline') throw new Error('Uso: knowledge:plan -- --baseline caminho.json');
    const baseline = JSON.parse(readFileSync(resolve(args[1]), 'utf8'));
    const current = validateManifest(buildManifest());
    if (readFileSync(resolve(ROOT, MANIFEST), 'utf8') !== serialize(current)) throw new Error('Reconstrua o manifesto antes de planejar.');
    process.stdout.write(serialize(incrementalPlan(baseline, current)));
  } else throw new Error('Comando desconhecido');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
