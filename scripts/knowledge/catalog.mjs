import { buildManifest as documentManifest } from '../docs/lib.mjs';
import { buildInventory, codeManifest, INVENTORY, MANIFEST as CODE_MANIFEST } from '../code/lib.mjs';
import { ROOT, byId, hash, validateManifest } from './common.mjs';

// Reconstrói a partir de src/; nunca importa arrays gerados potencialmente vazios/desatualizados.
export function buildKnowledge(root = ROOT, inventory = buildInventory(root)) {
  const documents = documentManifest(root);
  const code = codeManifest(root, inventory);
  const manifest = {
    ...documents,
    catalog: 'knowledge',
    extractor_version: `${documents.extractor_version}+${code.extractor_version}`,
    code_artifacts: [
      { path: INVENTORY, sha256: hash(inventory) },
      { path: CODE_MANIFEST, sha256: hash(code) },
    ],
    code_entities: code.entities,
    symbol_relations: code.symbol_relations,
    chunks: [...documents.chunks, ...code.chunks].sort(byId),
    semantic_summaries: [...documents.semantic_summaries, ...code.semantic_summaries].sort(byId),
  };
  return validateManifest(manifest);
}
