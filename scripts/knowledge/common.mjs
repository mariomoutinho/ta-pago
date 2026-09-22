import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

export const ROOT = resolve(import.meta.dirname, '../..');
export const REPOSITORY = 'mariomoutinho/ta-pago';
export const DOC_EXTRACTOR = 'document-json-v2';
export const CODE_EXTRACTOR = 'typescript-ast-v2';
export const CHUNKING = 'atomic-source-v1';
export const fail = (message) => { throw new Error(message); };
export const serialize = (value) => JSON.stringify(value, null, 2) + '\n';
export const canonical = (value) => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
export const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
export const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export const unique = (values) => [...new Set(values)].sort();
export const readJSON = (root, path) => JSON.parse(readFileSync(safePath(root, path), 'utf8'));

export function safePath(root, path) {
  root = resolve(root);
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\') || path.split('/').some((p) => p === '..' || p === '.')) fail(`Caminho fora do repositório ou inseguro: ${path}`);
  const target = resolve(root, path);
  if (!target.startsWith(root + sep)) fail(`Caminho fora do repositório: ${path}`);
  let cursor = root;
  for (const part of relative(root, target).split(sep)) {
    cursor = resolve(cursor, part);
    // lstat também encontra links quebrados.
    try { if (lstatSync(cursor).isSymbolicLink()) fail(`Link simbólico não permitido: ${path}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (existsSync(target) && !realpathSync(target).startsWith(realpathSync(root) + sep)) fail(`Caminho fora do repositório: ${path}`);
  return target;
}

// Implementa apenas o subconjunto de JSON Schema usado pelos dois contratos locais.
export function validateValue(value, rule, label) {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
  const types = Array.isArray(rule.type) ? rule.type : [rule.type];
  if (!types.includes(type) && !(type === 'integer' && types.includes('number'))) fail(`${label}: tipo inválido`);
  if (rule.enum && !rule.enum.includes(value)) fail(`${label}: valor inválido`);
  if (value === null) return;
  if (type === 'string') {
    if (rule.minLength && value.trim().length < rule.minLength) fail(`${label}: vazio`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) fail(`${label}: formato inválido`);
    if (rule.format === 'date') {
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) fail(`${label}: data inválida`);
      if (value > new Date().toISOString().slice(0, 10)) fail(`${label}: data futura`);
    }
  }
  if (type === 'array') {
    if (value.length < (rule.minItems ?? 0)) fail(`${label}: vazio`);
    if (rule.uniqueItems && new Set(value.map(canonical)).size !== value.length) fail(`${label}: itens duplicados`);
    value.forEach((item, i) => validateValue(item, rule.items, `${label}[${i}]`));
  }
  if (type === 'object') {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail(`${label}: campo obrigatório ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (!Object.hasOwn(rule.properties ?? {}, key)) {
        if (rule.additionalProperties === false) fail(`${label}: campo desconhecido ${key}`);
      } else validateValue(item, rule.properties[key], `${label}.${key}`);
    }
  }
  if ((type === 'integer' || type === 'number') && rule.minimum !== undefined && value < rule.minimum) fail(`${label}: abaixo do mínimo`);
}

export function provenance(root = ROOT) {
  const config = readJSON(root, 'knowledge/config.json');
  if (config.repository !== REPOSITORY || typeof config.branch !== 'string' || !/^[\w./-]+$/.test(config.branch) || config.branch.includes('..') || (config.commit_sha !== null && !/^[a-f0-9]{40}$/.test(config.commit_sha))) fail('Proveniência inválida');
  // Âncora de origem, não o commit que conterá os artefatos gerados. Não muda com HEAD.
  const git = (...args) => {
    try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EPERM') return null;
      return false;
    }
  };
  const top = git('rev-parse', '--show-toplevel');
  if (top === root) {
    const remote = git('remote', 'get-url', 'origin');
    if (remote && !new RegExp(`github\\.com[:/]${REPOSITORY}(?:\\.git)?$`).test(remote)) fail('repository diverge do origin');
    if (config.commit_sha) {
      const type = git('cat-file', '-t', config.commit_sha);
      if (type === false || (type !== null && type !== 'commit')) fail('commit_sha não existe como commit local; use histórico completo');
      if (git('merge-base', '--is-ancestor', config.commit_sha, 'HEAD') === false) fail('commit_sha não pertence à história de HEAD');
      let sourceRef = git('rev-parse', '--verify', `refs/remotes/origin/${config.branch}`);
      if (sourceRef === false) sourceRef = git('rev-parse', '--verify', `refs/heads/${config.branch}`);
      if (sourceRef === false) fail('branch de origem não encontrada no histórico disponível');
      if (sourceRef && git('merge-base', '--is-ancestor', config.commit_sha, sourceRef) === false) fail('commit_sha diverge da branch de origem');
    }
  }
  return config;
}

export function emptyManifest(config, kind, extractor) {
  return { schema_version: 2, ...config, version: 'knowledge-v2', catalog: kind, extractor_version: extractor, chunking_version: CHUNKING,
    documents: [], code_entities: [], chunks: [],
    embeddings: { status: 'not_generated', model: null, items: [] },
    vectors: { status: 'not_generated', store: null, items: [] },
    indexes: ['path', 'symbol', 'domain', 'lexical'].map((type) => ({ id: `${type}-index`, type, status: type === 'lexical' ? 'not_generated' : 'planned', items: [] })),
    semantic_summaries: [], symbol_relations: [] };
}

export function makeChunk(source, type, content, summary, extractor) {
  const chunk = { id: `${source.id}::chunk:whole`, source_id: source.id, source_type: type, source_path: source.path ?? source.source_path,
    section: type === 'code' ? source.name : 'whole', name: source.name ?? source.title, entity_type: source.entity_type ?? null, content, token_estimate: Math.ceil([...content].length / 4), semantic_summary: summary,
    metadata: { entity_type: source.entity_type ?? null, repository: source.repository, branch: source.branch, commit_sha: source.commit_sha, version: source.version,
      status: source.status, domain: source.domain, confidence: source.confidence ?? null, authority: source.authority ?? 'code',
      audience: source.audience ?? ['developer', 'ai_agent', 'reviewer'], sensitivity: source.sensitivity ?? 'internal',
      framework_version: source.framework_version, source_sha256: source.sha256, extractor_version: extractor, chunking_version: CHUNKING } };
  return { ...chunk, sha256: hash(chunk) };
}
export const summaries = (chunks) => chunks.map((c) => ({ id: `${c.id}::summary`, chunk_id: c.id, ...c.semantic_summary }));

export function validateManifest(value) {
  if (!value || value.schema_version !== 2 || !['documents', 'code', 'knowledge'].includes(value.catalog) || value.repository !== REPOSITORY || typeof value.extractor_version !== 'string' || typeof value.chunking_version !== 'string') fail('Manifesto inválido ou versão incompatível');
  for (const key of ['documents', 'code_entities', 'chunks', 'symbol_relations', 'semantic_summaries', 'indexes']) {
    if (!Array.isArray(value[key])) fail(`Manifesto inválido: ${key}`);
    const ids = new Set();
    for (const item of value[key]) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) fail(`Entrada inválida ou duplicada: ${key}`);
      ids.add(item.id);
      if (['documents', 'code_entities', 'chunks', 'symbol_relations'].includes(key) && !/^[a-f0-9]{64}$/.test(item.sha256)) fail(`Hash inválido: ${key}`);
      const path = item.path ?? item.source_path;
      if (path && (isAbsolute(path) || path.includes('\\') || path.split('/').some((p) => !p || p === '..' || p === '.'))) fail('Caminho inválido no manifesto');
    }
  }
  if (value.catalog === 'documents' && (value.code_entities.length || value.symbol_relations.length)) fail('Catálogos misturados');
  if (value.catalog === 'code' && value.documents.length) fail('Catálogos misturados');
  if (canonical(value.embeddings) !== canonical({ status: 'not_generated', model: null, items: [] }) || canonical(value.vectors) !== canonical({ status: 'not_generated', store: null, items: [] })) fail('Artefato externo não permitido nesta fase');
  const sources = new Map([...value.documents, ...value.code_entities, ...value.symbol_relations].map((e) => [e.id, e]));
  for (const chunk of value.chunks) {
    if (!sources.has(chunk.source_id) || typeof chunk.content !== 'string' || !chunk.semantic_summary) fail('Chunk sem fonte ou resumo');
    const { sha256, ...content } = chunk;
    if (hash(content) !== sha256) fail('Hash de chunk inválido');
  }
  for (const relation of value.symbol_relations) if (!relation.references?.every((id) => sources.has(id))) fail('Relação sem símbolo');
  return value;
}

export function diffItems(before, after, invalidate = false) {
  const previous = new Map(before.map((item) => [item.id, item]));
  const current = new Map(after.map((item) => [item.id, item]));
  const added = [], updated = [], removed = [], unchanged = [];
  for (const item of [...after].sort(byId)) {
    const old = previous.get(item.id);
    if (!old) added.push(item);
    else if (invalidate || canonical(old) !== canonical(item)) updated.push({ before: old, after: item });
    else unchanged.push(item.id);
  }
  for (const item of [...before].sort(byId)) if (!current.has(item.id)) removed.push(item);
  return { added, updated, removed, unchanged };
}

export function incrementalPlan(before, after) {
  validateManifest(before); validateManifest(after);
  if (before.catalog !== after.catalog || before.repository !== after.repository || before.branch !== after.branch) fail('Baseline de catálogo ou origem diferente');
  const extractorChanged = before.extractor_version !== after.extractor_version;
  const chunkingChanged = before.chunking_version !== after.chunking_version;
  return { schema_version: 2, applied: false, catalog: after.catalog, extractor_changed: extractorChanged, chunking_changed: chunkingChanged,
    ...Object.fromEntries(['documents', 'code_entities', 'chunks', 'symbol_relations'].map((key) => [key, diffItems(before[key], after[key], extractorChanged || (key === 'chunks' && chunkingChanged))])) };
}
