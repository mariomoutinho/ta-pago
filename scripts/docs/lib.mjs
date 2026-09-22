import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { ROOT, DOC_EXTRACTOR, safePath, fail, validateValue, readJSON, provenance, hash, emptyManifest, makeChunk, summaries, byId } from '../knowledge/common.mjs';
export { ROOT, safePath, serialize, incrementalPlan, validateManifest } from '../knowledge/common.mjs';
export const MANIFEST = 'knowledge/manifest.json';
const read = (root, path) => readFileSync(safePath(root, path), 'utf8');

export function documentPaths(root) {
  const result = ['README.md', 'AGENTS.md'];
  function walk(dir) {
    for (const item of readdirSync(safePath(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      safePath(root, path);
      if (item.isDirectory()) walk(path);
      else if (item.name.endsWith('.md')) result.push(path);
    }
  }
  walk('docs');
  return result.sort();
}

export function parseDocument(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) fail(`${file}: front matter ausente`);
  let metadata;
  try { metadata = JSON.parse(match[1]); }
  catch { fail(`${file}: front matter deve ser JSON válido`); }
  return { metadata, body: match[2] };
}

export function validateMetadata(metadata, schema, file) { validateValue(metadata, schema, file); }
export function validateLinks(root, file, body) {
  // Links inline e definições de referência; URLs e âncoras não são acessadas.
  const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const targets = [
    ...Array.from(prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g), (m) => m[1]),
    ...Array.from(prose.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm), (m) => m[1]),
  ];
  for (let target of targets) {
    target = target.replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    if (/^[a-z]+:/i.test(target) || target.startsWith('/')) fail(`${file}: link não permitido: ${target}`);
    const path = decodeURIComponent(target.split(/[?#]/)[0]);
    if (!path) continue;
    const absolute = safePath(root, relative(root, resolve(root, dirname(file), path)));
    if (!existsSync(absolute)) fail(`${file}: link local quebrado: ${target}`);
  }
}

export function collect(root = ROOT) {
  const schema = readJSON(root, 'knowledge/document.schema.json');
  const config = provenance(root);
  const ids = new Set();
  const documents = documentPaths(root).map((path) => {
    const text = read(root, path);
    const { metadata, body } = parseDocument(text, path);
    validateMetadata(metadata, schema, path);
    if (ids.has(metadata.id)) fail(`${path}: ID duplicado: ${metadata.id}`);
    ids.add(metadata.id);
    for (const key of ['repository', 'branch', 'commit_sha']) if (metadata[key] !== config[key]) fail(`${path}: ${key} inconsistente com a origem em knowledge/config.json`);
    if (!body.replace(/\r\n/g, '\n').startsWith(`\n# ${metadata.title}\n`)) fail(`${path}: título deve corresponder aos metadados`);
    if (metadata.status === 'deprecated' && metadata.indexable) fail(`${path}: documento obsoleto não pode ser indexável`);
    for (const source of metadata.sources) {
      if (/^[a-z]+:/i.test(source)) fail(`${path}: sources aceita somente caminhos locais`);
      const absolute = safePath(root, source);
      if (!existsSync(absolute) || !lstatSync(absolute).isFile()) fail(`${path}: fonte ausente: ${source}`);
    }
    validateLinks(root, path, body);
    return { ...metadata, path, sha256: hash(text) };
  });
  for (const doc of documents) for (const field of ['supersedes', 'related_documents']) {
    for (const id of doc[field]) if (!ids.has(id) || id === doc.id) fail(`${doc.path}: ${field} referencia ID inexistente ou o próprio documento: ${id}`);
  }
  return documents;
}

export function buildManifest(root = ROOT) {
  const manifest = emptyManifest(provenance(root), 'documents', DOC_EXTRACTOR);
  manifest.documents = collect(root).filter((doc) => doc.indexable).sort(byId);
  manifest.chunks = manifest.documents.map((doc) => {
    const { body } = parseDocument(read(root, doc.path), doc.path);
    const summary = { representation: `Documento: ${doc.title}`, responsibility: `Registra ${doc.title.toLowerCase()} sob autoridade ${doc.authority}; domínio ${doc.domain}.`,
      related_symbols: [], related_documents: doc.related_documents, status: doc.status,
      evidence: [{ source_path: doc.path, section: 'whole', sha256: doc.sha256 }], confidence: 'observed' };
    // Documento inteiro é uma unidade atômica: preserva tabelas, regras e critérios.
    return makeChunk(doc, 'document', body.trim() + '\n', summary, DOC_EXTRACTOR);
  }).sort(byId);
  manifest.semantic_summaries = summaries(manifest.chunks);
  return manifest;
}
