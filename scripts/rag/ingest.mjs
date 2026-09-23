import { RagError } from './config.mjs';
import { validateVector } from './providers.mjs';

export function ingestionPlan(chunks, stored, provider) {
  const old = new Map(stored.map(c => [c.chunk_id, c])), ids = new Set(chunks.map(c => c.chunk_id));
  const result = { new: [], updated: [], unchanged: [], deleted: stored.filter(c => !ids.has(c.chunk_id)).map(c => c.chunk_id) };
  for (const chunk of chunks) {
    const previous = old.get(chunk.chunk_id);
    const group = !previous ? 'new' : previous.index_hash !== chunk.index_hash || previous.embedding_model !== provider.model || previous.embedding_dimensions !== provider.dimensions ? 'updated' : 'unchanged';
    result[group].push(chunk.chunk_id);
  }
  return result;
}
export const planCounts = plan => ({ ...Object.fromEntries(Object.entries(plan).map(([k,v]) => [k,v.length])), would_embed: plan.new.length + plan.updated.length, would_delete: plan.deleted.length });

export async function ingest(corpus, store, provider, { dryRun = false, batchSize = 16, log = () => {} } = {}) {
  if (store.dimensions !== provider.dimensions) throw new RagError('DIMENSION_MISMATCH', 'Provider e banco usam dimensões diferentes.');
  await store.assertCompatible();
  if (dryRun) {
    const plan = ingestionPlan(corpus.chunks, await store.listState(), provider);
    return { applied: false, ...planCounts(plan), plan };
  }
  const started = Date.now(); log('rag.ingest.start', { count: corpus.chunks.length });
  return store.transaction(async tx => {
    const plan = ingestionPlan(corpus.chunks, await tx.listState(), provider);
    const changed = new Set([...plan.new, ...plan.updated]);
    const pending = corpus.chunks.filter(c => changed.has(c.chunk_id));
    for (let start = 0; start < pending.length; start += batchSize) {
      const batch = pending.slice(start, start + batchSize);
      const embeddings = await provider.embedBatch(batch.map(c => `${c.source_path}\n${c.symbol}\n${c.domain}\n${c.content}`));
      if (embeddings.length !== batch.length) throw new RagError('INVALID_EMBEDDING', 'Número de vetores difere do lote.');
      for (let i = 0; i < batch.length; i++) await tx.upsert(batch[i], validateVector(embeddings[i], provider.dimensions), provider);
    }
    await tx.delete(plan.deleted);
    await tx.saveState(corpus, provider);
    const counts = planCounts(plan);
    log('rag.ingest.complete', { ...counts, embedded: pending.length, duration_ms: Date.now() - started });
    return { applied: true, discovered: corpus.chunks.length, ...counts, embedded: pending.length,
      vectors_inserted: plan.new.length, vectors_updated: plan.updated.length, vectors_deleted: plan.deleted.length, errors: 0 };
  });
}
