import { assertSafeText } from './corpus.mjs';
import { RagError } from './config.mjs';

export const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const stop = new Set('a o as os de da do das dos e em no na nos nas um uma como onde qual quais que por para pelo pela com ao se sao esta este esse utilizado utilizada utiliza funciona projeto componente hook arquivo'.split(' '));
export const terms = text => [...new Set((normalize(text).match(/[\p{L}\p{N}_]+/gu) ?? []).filter(t => t.length > 1 && !stop.has(t)))];

export function analyzeQuery(query, corpus) {
  if (typeof query !== 'string' || !query.trim() || query.length > 4000) throw new RagError('INVALID_QUERY', 'Pergunta deve ter entre 1 e 4000 caracteres.');
  assertSafeText(query);
  const tokens = terms(query), lower = normalize(query);
  const routeMentions = (query.match(/(?:^|\s)\/[\w/-]*(?=\s|[?.,]|$)/g) ?? []).map(value => value.trim());
  const symbols = [...new Set(corpus.chunks.filter(c => tokens.includes(normalize(c.symbol)) || routeMentions.includes(c.symbol)).map(c => c.symbol))];
  const paths = [...new Set(query.match(/(?:src\/|docs\/)[\w./-]+|[\w-]+(?:\.web)?\.(?:tsx?|md)/g) ?? [])];
  let type = 'general_semantic';
  if (/arquitetura|estrutura|organiz/.test(lower)) type = 'architecture';
  if (/document|requisito|planejad/.test(lower)) type = 'documentation';
  if (/funciona|comportamento|quando/.test(lower)) type = 'behavior';
  if (/navega|rota|abas/.test(lower)) type = 'navigation';
  if (/erro|bug|falha|nao funciona/.test(lower)) type = 'bug_investigation';
  if (symbols.length || /\b(?:use[A-Z]\w*|handle[A-Z]\w*)\b/.test(query)) type = 'symbol_lookup';
  const inferredDomain = /navega|rotas/.test(lower) ? 'routing' : /tema|cores/.test(lower) ? 'hooks' : /corrida/.test(lower) ? 'running' : null;
  const domain = corpus.chunks.some(c => c.domain === inferredDomain) ? inferredDomain : null;
  const weights = { semantic: 1, lexical: 1, symbol: 1, path: 1, domain: 0.3 };
  if (type === 'symbol_lookup') { weights.symbol = 3; weights.lexical = 1.5; weights.semantic = 0.7; }
  if (paths.length) weights.path = 3;
  if (['architecture', 'documentation', 'general_semantic'].includes(type)) weights.semantic = 1.5;
  return { query, type, tokens, symbols, paths, domain, weights, lexicalQuery: tokens.map(t => `"${t}"`).join(' OR ') || query };
}

export function reciprocalRankFusion(lists, weights, k = 60) {
  const fused = new Map();
  for (const [channel, candidates] of Object.entries(lists)) {
    const seen = new Set();
    candidates.forEach((candidate, index) => {
      const id = candidate.chunk.chunk_id;
      if (seen.has(id)) return;
      seen.add(id);
      const item = fused.get(id) ?? { ...candidate, score: 0, channels: {}, relation: null };
      item.score += (weights[channel] ?? 1) / (k + index + 1);
      item.channels[channel] = { rank: index + 1, score: candidate.score };
      fused.set(id, item);
    });
  }
  return [...fused.values()].sort((a,b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id));
}

export async function expandRelations(candidates, corpus, store, options, { depth = 1, maxChunks = 5 } = {}) {
  const bySource = new Map(corpus.chunks.map(c => [c.source_id, c.chunk_id]));
  const visited = new Set(candidates.map(c => c.chunk.source_id));
  let frontier = candidates.slice(0, 5).map(c => c.chunk.source_id);
  const discovered = [], relationships = [], seenRelations = new Set();
  for (let level = 1; level <= depth && discovered.length < maxChunks; level++) {
    const next = [];
    for (const source of frontier) {
      for (const relation of corpus.relations) {
        const target = relation.from === source ? relation.to : relation.to === source ? relation.from : null;
        if (!target || !bySource.has(target)) continue;
        if (visited.has(target)) {
          if (candidates.some(c => c.chunk.source_id === target) && !seenRelations.has(relation.id)) {
            seenRelations.add(relation.id); relationships.push({ ...relation, depth: level });
          }
          continue;
        }
        visited.add(target);
        const matches = await store.getByChunkId([bySource.get(target)], options);
        if (!matches.length) continue;
        seenRelations.add(relation.id); relationships.push({ ...relation, depth: level });
        discovered.push({ ...matches[0], score: (candidates[0]?.score ?? 0) * 0.85 / level, channels: { relation: { rank: discovered.length + 1, score: 1 / level } }, relation });
        next.push(target);
        if (discovered.length >= maxChunks) break;
      }
      if (discovered.length >= maxChunks) break;
    }
    frontier = next;
  }
  return { candidates: [...candidates, ...discovered], added: discovered, relationships };
}

// Interface Reranker: rerank(query, candidates, analysis). Não depende de LLM.
export class HeuristicReranker {
  rerank(query, candidates, analysis) {
    return candidates.map(candidate => {
      const c = candidate.chunk;
      const haystack = normalize(`${c.symbol} ${c.source_path} ${c.content}`);
      const coverage = analysis.tokens.filter(t => haystack.includes(t)).length / Math.max(1, analysis.tokens.length);
      const exactSymbol = analysis.symbols.includes(c.symbol) ? 1 : 0;
      const exactPath = analysis.paths.some(p => c.source_path === p || c.filename === p || c.source_path.startsWith(p)) ? 1 : 0;
      const penalty = c.symbol_type === 'symbol-relation' ? 0.65 : c.symbol_type === 'interface-behavior' ? 0.8 : 1;
      return { ...candidate, fusion_score: candidate.score,
        score: candidate.score * (1 + coverage + 1.5 * exactSymbol + exactPath) * penalty };
    }).sort((a,b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id));
  }
}
