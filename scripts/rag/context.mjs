import { terms } from './retrieval.mjs';

const nearDuplicate = (a,b) => {
  if (a.content === b.content) return true;
  if (a.source_path !== b.source_path) return false; // Variantes web/nativa são evidências diferentes.
  const overlap = Math.max(0, Math.min(a.end_line,b.end_line) - Math.max(a.start_line,b.start_line) + 1);
  if (overlap / Math.min(a.end_line-a.start_line+1,b.end_line-b.start_line+1) > 0.9) return true;
  const left = new Set(terms(a.content)), right = new Set(terms(b.content));
  return [...left].filter(t => right.has(t)).length / Math.max(1, new Set([...left,...right]).size) > 0.92;
};

export class ContextBuilder {
  constructor({ maxChunks = 8, maxContextTokens = 12000 } = {}) { this.maxChunks = maxChunks; this.budget = maxContextTokens; }
  build(candidates, relationships = []) {
    const sources = [], selected = [], blocks = []; let used = 0;
    for (const candidate of candidates) {
      if (selected.length >= this.maxChunks) break;
      const c = candidate.chunk;
      if (selected.some(s => nearDuplicate(s.chunk,c))) continue;
      const id = `S${sources.length+1}`;
      const header = `SOURCE ${id}\nfile: ${c.source_path}\nlines: ${c.start_line}-${c.end_line}\nsymbol: ${c.symbol}\nchunk: ${c.chunk_id}\nauthority: ${c.metadata.authority}; status: ${c.metadata.status}; confidence: ${c.metadata.confidence ?? 'document'}\n\n`;
      // UTF-8 bytes são um limite conservador para tokenizadores com byte fallback.
      // Inclui cabeçalhos, separadores e marcador; não usa chars/4 como garantia.
      const remaining = this.budget - used;
      const allowance = Math.min(remaining, Math.max(900, Math.floor(this.budget / this.maxChunks * 2)));
      let body = '', truncated = false;
      for (const char of c.content) {
        if (Buffer.byteLength(header + body + char + '\n[trecho truncado]\n\n') > allowance) { truncated = true; break; }
        body += char;
      }
      if (!body.trim()) continue;
      const block = header + body + (truncated ? '\n[trecho truncado]' : '') + '\n\n';
      used += Buffer.byteLength(block); blocks.push(block); selected.push(candidate);
      sources.push({ id, chunk_id: c.chunk_id, path: c.source_path, start_line: c.start_line, end_line: c.end_line,
        symbol: c.symbol, score: candidate.score, truncated });
    }
    const selectedSources = new Map(selected.map((item,i) => [item.chunk.source_id,sources[i].id]));
    for (const relation of relationships) {
      const from = selectedSources.get(relation.from), to = selectedSources.get(relation.to);
      if (!from || !to) continue;
      const line = `RELATION ${from} --${relation.kind}--> ${to}; confidence: ${relation.confidence}\n`;
      if (used + Buffer.byteLength(line) > this.budget) break;
      blocks.push(line); used += Buffer.byteLength(line);
    }
    return { text: blocks.join(''), sources, selected, token_upper_bound: used, max_context_tokens: this.budget };
  }
}
