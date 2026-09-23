import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { buildKnowledge } from '../knowledge/catalog.mjs';
import { ROOT, readJSON, validateManifest, canonical, hash, safePath } from '../knowledge/common.mjs';
import { RagError } from './config.mjs';

const blocked = /(?:^|\/)(?:\.[^/]+|node_modules|dist|build|assets|coverage|generated|fixtures|credentials|personal-data)(?:\/|$)|\.(?:pem|key|log)$/i;
const sensitive = /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{12,}|(?:password|api[_-]?key|secret|token)\s*[:=]\s*["'][^"'\s]{8,}["']|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+\d[\d ()-]{10,}\d/i;
export function assertSafeText(text) {
  if (sensitive.test(text)) throw new RagError('SENSITIVE_CONTENT', 'Possível segredo ou dado sensível; conteúdo não enviado nem registrado.');
}
export function assertSourcePath(path) {
  if (typeof path !== 'string' || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || blocked.test(path) || /(?:^|\/)(?:credentials?|private[-_]key)(?:\.|\/|$)/i.test(path) || !(path === 'README.md' || /^docs\/.+\.md$/.test(path) || /^src\/.+\.tsx?$/.test(path)) || /\.d\.ts$|\.(test|spec|generated)\.tsx?$/.test(path)) {
    throw new RagError('UNSAFE_SOURCE', 'Fonte fora do corpus permitido.');
  }
}

export function loadCorpus(root = ROOT) {
  const manifest = validateManifest(readJSON(root, 'knowledge/manifest.json'));
  if (canonical(manifest) !== canonical(buildKnowledge(root))) throw new RagError('STALE_MANIFEST', 'Regere os catálogos com code:inventory e knowledge:build.');
  const sources = new Map([...manifest.documents, ...manifest.code_entities, ...manifest.symbol_relations].map(s => [s.id, s]));
  const chunks = manifest.chunks.map(c => {
    assertSourcePath(c.source_path);
    if (!['public', 'internal'].includes(c.metadata.sensitivity)) throw new RagError('UNSAFE_SOURCE', 'Sensibilidade não autorizada para este corpus.');
    const source = sources.get(c.source_id);
    const raw = readFileSync(safePath(root, c.source_path), 'utf8');
    assertSafeText(raw); assertSafeText(c.content);
    let start = source.start_line, end = source.end_line, content = c.content;
    if (c.source_type === 'document') {
      const offset = raw.indexOf(c.content);
      if (offset < 0) throw new RagError('INVALID_EVIDENCE', 'Trecho documental não encontrado na fonte.');
      start = raw.slice(0, offset).split('\n').length;
      end = start + c.content.split('\n').length - 1;
    } else {
      // Evita repetir os mesmos snippets em behavior/evidence do catálogo AST.
      content = `${c.semantic_summary.responsibility}\n\n` + source.evidence.map(e =>
        `${e.source_path}:${e.start_line}-${e.end_line}\n${e.snippet}`).join('\n\n');
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > raw.split('\n').length) throw new RagError('INVALID_EVIDENCE', 'Linhas inválidas na fonte.');
    const record = {
      chunk_id: c.id, source_id: c.source_id, source_path: c.source_path,
      filename: posix.basename(c.source_path), directory: posix.dirname(c.source_path),
      source_type: c.source_type, symbol: c.name, symbol_type: c.entity_type,
      domain: c.metadata.domain, language: c.source_type === 'code' ? 'typescript' : source.language,
      start_line: start, end_line: end, content, content_hash: c.sha256,
      summary: c.semantic_summary.responsibility ?? c.semantic_summary.representation ?? c.name,
      metadata: c.metadata,
    };
    // Metadados (incluindo deslocamentos de linha) também invalidam o registro.
    record.index_hash = hash({ version: 'rag-record-v1', record });
    return record;
  });
  return { key: `${manifest.repository}:${manifest.branch}`, hash: hash(manifest), chunks,
    relations: manifest.symbol_relations.map(r => ({ id: r.id, ...r.relation, confidence: r.confidence })), manifest };
}
