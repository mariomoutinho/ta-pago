// Este módulo só é importado por testes. Não há fallback/seleção dele na CLI.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PgVectorStore } from '../store.mjs';
import { terms } from '../retrieval.mjs';

export class TestEmbeddings {
  model = 'test-only-deterministic'; dimensions = 32; calls = 0;
  async embedText(text) { return (await this.embedBatch([text]))[0]; }
  async embedBatch(texts) {
    this.calls += texts.length;
    return texts.map(text => {
      const v = Array(this.dimensions).fill(0);
      for (const word of terms(text)) {
        let hash = 2166136261;
        for (const char of word) hash = Math.imul(hash ^ char.charCodeAt(0),16777619);
        v[(hash >>> 0) % v.length] += 1;
      }
      if (!v.some(Boolean)) v[0] = 1;
      const norm = Math.hypot(...v); return v.map(n => n/norm);
    });
  }
}

export async function testStore(key, dimensions = 32) {
  const db = new PGlite({ extensions: { vector } });
  const client = { query: async (sql,params) => params ? db.query(sql,params) : (await db.exec(sql)).at(-1), release() {} };
  const adapter = { ...client, connect: async () => client, end: () => db.close() };
  const store = new PgVectorStore(adapter,key,dimensions);
  await store.migrate();
  return store;
}
