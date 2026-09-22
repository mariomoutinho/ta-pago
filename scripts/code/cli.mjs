import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, MANIFEST, INVENTORY, buildInventory, codeManifest, serialize, incrementalPlan } from './lib.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  if (command !== 'plan' && args.length) throw new Error('Argumentos inesperados');
  if (!['inventory', 'check', 'plan'].includes(command)) throw new Error('Comando desconhecido');
  if (command === 'plan' && (args.length !== 2 || args[0] !== '--baseline')) throw new Error('Uso: knowledge:plan-code -- --baseline caminho.json');
  const inventory = buildInventory();
  const manifest = codeManifest(ROOT, inventory);
  if (command === 'inventory') {
    writeFileSync(resolve(ROOT, INVENTORY), serialize(inventory));
    writeFileSync(resolve(ROOT, MANIFEST), serialize(manifest));
    console.log(`${inventory.entities.length} entidades, ${inventory.symbol_relations.length} relações e ${manifest.chunks.length} chunks gerados localmente.`);
    for (const item of inventory.exclusions.filter((e) => e.reason === 'sensitive-content-file-excluded')) console.log(`Conteúdo excluído por possível sensibilidade: ${item.source_path}; nomes: ${(item.symbols ?? []).join(', ')}`);
  } else {
    for (const [path, expected] of [[INVENTORY, inventory], [MANIFEST, manifest]]) {
      if (readFileSync(resolve(ROOT, path), 'utf8') !== serialize(expected)) throw new Error(`${path} desatualizado. Execute npm run code:inventory.`);
    }
    if (command === 'check') console.log('Inventário e manifesto de código atualizados; sem ingestão externa.');
    else process.stdout.write(serialize(incrementalPlan(JSON.parse(readFileSync(resolve(args[1]), 'utf8')), manifest)));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
