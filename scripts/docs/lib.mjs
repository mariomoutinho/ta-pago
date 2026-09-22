import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');
export const MANIFEST = 'knowledge/manifest.json';
const fail = (message) => { throw new Error(message); };
const read = (root, file) => readFileSync(resolve(root, file), 'utf8');

export function safePath(root, file) {
  const absolute = resolve(root, file);
  const inside = (candidate) => candidate === root || candidate.startsWith(root + sep);
  if (!inside(absolute) || (existsSync(absolute) && !inside(realpathSync(absolute)))) {
    fail(`Caminho fora do repositório: ${file}`);
  }
  return absolute;
}

export function documentPaths(root) {
  const result = ['README.md', 'AGENTS.md'];
  function walk(dir) {
    for (const item of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (item.isSymbolicLink()) fail(`Link simbólico não permitido no corpus: ${path}`);
      if (item.isDirectory()) walk(path);
      else if (item.name.endsWith('.md')) result.push(path);
    }
  }
  walk('docs');
  return result.sort();
}

// Subconjunto intencional: JSON entre delimitadores YAML. Sem parser YAML implícito.
export function parseDocument(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) fail(`${file}: front matter ausente`);
  let metadata;
  try { metadata = JSON.parse(match[1]); }
  catch { fail(`${file}: front matter deve ser JSON válido`); }
  return { metadata, body: match[2] };
}

export function validateMetadata(metadata, schema, file) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) fail(`${file}: metadados inválidos`);
  for (const key of schema.required) if (!(key in metadata)) fail(`${file}: campo obrigatório ${key}`);
  for (const [key, value] of Object.entries(metadata)) {
    const rule = schema.properties[key];
    if (!rule) fail(`${file}: campo desconhecido ${key}`);
    const type = Array.isArray(value) ? 'array' : typeof value;
    if (type !== rule.type) fail(`${file}: tipo inválido em ${key}`);
    if (rule.enum && !rule.enum.includes(value)) fail(`${file}: valor inválido em ${key}`);
    if (rule.minLength && value.trim().length < rule.minLength) fail(`${file}: ${key} vazio`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) fail(`${file}: formato inválido em ${key}`);
    if (rule.format === 'date') {
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) fail(`${file}: data inválida`);
      if (value > new Date().toISOString().slice(0, 10)) fail(`${file}: data de revisão futura`);
    }
    if (type === 'array') {
      if (rule.minItems && value.length < rule.minItems) fail(`${file}: ${key} vazio`);
      if (value.some((entry) => typeof entry !== 'string' || !entry.trim())) fail(`${file}: itens inválidos em ${key}`);
      if (new Set(value).size !== value.length) fail(`${file}: itens duplicados em ${key}`);
    }
  }
}

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
  const schema = JSON.parse(read(root, 'knowledge/document.schema.json'));
  const ids = new Set();
  return documentPaths(root).map((path) => {
    safePath(root, path);
    const text = read(root, path);
    const { metadata, body } = parseDocument(text, path);
    validateMetadata(metadata, schema, path);
    if (ids.has(metadata.id)) fail(`${path}: ID duplicado: ${metadata.id}`);
    ids.add(metadata.id);
    if (!body.startsWith(`\n# ${metadata.title}\n`)) fail(`${path}: título deve corresponder aos metadados`);
    if (metadata.status === 'deprecated' && metadata.indexable) fail(`${path}: documento obsoleto não pode ser indexável`);
    for (const source of metadata.sources) {
      if (/^[a-z]+:/i.test(source)) fail(`${path}: sources aceita somente caminhos locais`);
      const absolute = safePath(root, source);
      if (!existsSync(absolute) || !lstatSync(absolute).isFile()) fail(`${path}: fonte ausente: ${source}`);
    }
    validateLinks(root, path, body);
    return { ...metadata, path, sha256: createHash('sha256').update(text).digest('hex') };
  });
}

export function buildManifest(root = ROOT) {
  return { schema_version: 1, documents: collect(root).filter((doc) => doc.indexable) };
}

export function serialize(value) { return JSON.stringify(value, null, 2) + '\n'; }

export function validateManifest(value) {
  if (!value || value.schema_version !== 1 || !Array.isArray(value.documents)) fail('Manifesto inválido ou versão incompatível');
  const ids = new Set();
  const paths = new Set();
  for (const doc of value.documents) {
    if (!doc || typeof doc.id !== 'string' || !doc.id.trim() || typeof doc.path !== 'string' ||
        !/^(?:README\.md|AGENTS\.md|docs\/.+\.md)$/.test(doc.path) ||
        doc.path.includes('\\') || doc.path.split('/').some((part) => part === '..' || part === '.' || !part) || !/^[a-f0-9]{64}$/.test(doc.sha256) || doc.indexable !== true ||
        !['current', 'proposed'].includes(doc.status) || ids.has(doc.id) || paths.has(doc.path)) {
      fail('Entrada inválida ou duplicada no manifesto');
    }
    ids.add(doc.id); paths.add(doc.path);
  }
  return value;
}

export function incrementalPlan(before, after) {
  validateManifest(before); validateManifest(after);
  const previous = new Map(before.documents.map((doc) => [doc.id, doc]));
  const current = new Map(after.documents.map((doc) => [doc.id, doc]));
  const added = [], updated = [], removed = [], unchanged = [];
  for (const doc of after.documents) {
    const old = previous.get(doc.id);
    if (!old) added.push(doc);
    else if (serialize(old) !== serialize(doc)) updated.push({ before: old, after: doc });
    else unchanged.push(doc.id);
  }
  for (const doc of before.documents) if (!current.has(doc.id)) removed.push(doc);
  return { schema_version: 1, applied: false, added, updated, removed, unchanged };
}
