import { readFileSync } from 'node:fs';
import pg from 'pg';
import { RagError, requireConfig } from './config.mjs';
import { validateVector } from './providers.mjs';

export const INDEX_NAMES = ['vector', 'lexical', 'symbol', 'path', 'filename', 'directory', 'domain'].map(n => `knowledge_chunks_${n}`);
export function migrationSQL(dimensions) {
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 2000) throw new RagError('INVALID_CONFIGURATION', 'Dimensão deve estar entre 1 e 2000.');
  return readFileSync(new URL('../../knowledge/migrations/001_rag.sql', import.meta.url), 'utf8').replaceAll('__DIMENSIONS__', String(dimensions));
}
const vectorLiteral = (v, dimensions) => JSON.stringify(validateVector(v, dimensions));
const escapeLike = value => value.replace(/[\\%_]/g, '\\$&');

// Contrato de storage: upsert/delete/search/getByChunkId/healthCheck + transação e estado.
// O executor é pg.Pool/Client em produção; PostgreSQL WASM apenas nos testes.
export class PgVectorStore {
  constructor(db, corpusKey, dimensions, transactional = false) {
    this.db = db; this.key = corpusKey; this.dimensions = dimensions; this.transactional = transactional;
  }
  static connect(config, key) {
    if (!config.databaseUrl) requireConfig('DATABASE_URL');
    const db = new pg.Pool({ connectionString: config.databaseUrl, max: 4, connectionTimeoutMillis: 5000, statement_timeout: config.timeoutMs });
    // Evita erros assíncronos de conexões ociosas derrubarem o processo ou vazarem URL.
    db.on('error', () => {});
    return new PgVectorStore(db, key, config.dimensions);
  }
  async close() { await this.db.end?.(); }
  async migrate() {
    const old = await this.db.query("SELECT format_type(atttypid, atttypmod) AS type FROM pg_attribute WHERE attrelid=to_regclass('knowledge_chunks') AND attname='embedding'");
    if (old.rows.length && old.rows[0].type !== `vector(${this.dimensions})`) throw new RagError('DIMENSION_MISMATCH', 'Banco usa outra dimensão; migre explicitamente para um banco separado.');
    await this.transaction(async tx => { await tx.db.query(migrationSQL(this.dimensions)); });
  }
  async transaction(fn) {
    if (this.transactional) return fn(this);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      // Serializa ingestões do mesmo corpus e garante rollback integral em falhas.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [this.key]);
      const result = await fn(new PgVectorStore(client, this.key, this.dimensions, true));
      await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async state() {
    const result = await this.db.query('SELECT * FROM knowledge_index_state WHERE corpus_key=$1', [this.key]);
    return result.rows[0] ?? null;
  }
  async listState() {
    return (await this.db.query('SELECT chunk_id,index_hash,embedding_model,embedding_dimensions FROM knowledge_chunks WHERE corpus_key=$1', [this.key])).rows;
  }
  async saveState(corpus, provider) {
    await this.db.query(`INSERT INTO knowledge_index_state (corpus_key,manifest_hash,embedding_model,embedding_dimensions,chunk_count)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (corpus_key) DO UPDATE SET manifest_hash=$2,embedding_model=$3,embedding_dimensions=$4,chunk_count=$5,indexed_at=now()`,
    [this.key, corpus.hash, provider.model, provider.dimensions, corpus.chunks.length]);
  }
  async upsert(chunk, embedding, provider) {
    const values = [this.key, chunk.chunk_id, chunk.source_id, chunk.source_path, chunk.filename, chunk.directory,
      chunk.source_type, chunk.symbol, chunk.domain, chunk.content, chunk.content_hash, chunk.index_hash, JSON.stringify(chunk),
      vectorLiteral(embedding, this.dimensions), provider.model, provider.dimensions];
    await this.db.query(`INSERT INTO knowledge_chunks
      (corpus_key,chunk_id,source_id,source_path,filename,directory,source_type,symbol,domain,content,content_hash,index_hash,record,embedding,embedding_model,embedding_dimensions)
      VALUES (${values.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (corpus_key,chunk_id) DO UPDATE SET
      source_id=$3,source_path=$4,filename=$5,directory=$6,source_type=$7,symbol=$8,domain=$9,content=$10,content_hash=$11,index_hash=$12,record=$13,embedding=$14,embedding_model=$15,embedding_dimensions=$16,indexed_at=now()`, values);
  }
  async delete(ids) { if (ids.length) await this.db.query('DELETE FROM knowledge_chunks WHERE corpus_key=$1 AND chunk_id=ANY($2::text[])', [this.key, ids]); }
  async getByChunkId(ids, options = {}) {
    if (!ids.length) return [];
    const { clauses, values, bind } = this.filters(options);
    clauses.push(`chunk_id=ANY(${bind(ids)}::text[])`);
    return this.results(await this.db.query(`SELECT record,0 AS score FROM knowledge_chunks WHERE ${clauses.join(' AND ')} ORDER BY chunk_id`, values));
  }
  filters(options) {
    const values = [this.key], clauses = ['corpus_key=$1'];
    const bind = value => { values.push(value); return `$${values.length}`; };
    for (const [option, column] of [['domain', 'domain'], ['sourceType', 'source_type']]) if (options[option]) clauses.push(`${column}=${bind(options[option])}`);
    if (options.path) {
      const p = bind(escapeLike(options.path.toLowerCase()));
      clauses.push(`(lower(source_path) LIKE ${p} || '%' OR lower(filename)=${p} OR lower(directory) LIKE ${p} || '%')`);
    }
    if (options.symbol) clauses.push(`lower(symbol)=lower(${bind(options.symbol)})`);
    return { values, clauses, bind };
  }
  results(result) { return result.rows.map(r => ({ chunk: r.record, score: Number(r.score), metadata: r.record.metadata,
    source: { path: r.record.source_path, start_line: r.record.start_line, end_line: r.record.end_line } })); }
  async search(vector, options = {}) {
    const { values, clauses, bind } = this.filters(options);
    const v = bind(vectorLiteral(vector, this.dimensions));
    clauses.push(`1 - (embedding <=> ${v}::vector) >= ${bind(options.minimumScore ?? -1)}`);
    const limit = bind(options.topK ?? 8);
    return this.results(await this.db.query(`SELECT record,1-(embedding <=> ${v}::vector) AS score
      FROM knowledge_chunks WHERE ${clauses.join(' AND ')} ORDER BY embedding <=> ${v}::vector,chunk_id LIMIT ${limit}`, values));
  }
  async lexicalSearch(query, options = {}) {
    const { values, clauses, bind } = this.filters(options);
    const q = bind(query);
    const tsquery = `(websearch_to_tsquery('simple',${q}) || websearch_to_tsquery('portuguese',${q}))`;
    clauses.push(`search_text @@ ${tsquery}`);
    const limit = bind(options.topK ?? 8);
    return this.results(await this.db.query(`SELECT record,ts_rank_cd(search_text,${tsquery}) AS score FROM knowledge_chunks
      WHERE ${clauses.join(' AND ')} ORDER BY score DESC,chunk_id LIMIT ${limit}`, values));
  }
  async symbolSearch(symbols, options = {}) {
    if (!symbols.length) return [];
    const { values, clauses, bind } = this.filters(options);
    clauses.push(`lower(symbol)=ANY(${bind(symbols.map(s => s.toLowerCase()))}::text[])`);
    return this.results(await this.db.query(`SELECT record,1 AS score FROM knowledge_chunks WHERE ${clauses.join(' AND ')} ORDER BY chunk_id LIMIT ${bind(options.topK ?? 8)}`, values));
  }
  async pathSearch(paths, options = {}) {
    if (!paths.length) return [];
    const { values, clauses, bind } = this.filters(options);
    clauses.push('(' + paths.map(path => {
      const p = bind(escapeLike(path.toLowerCase()));
      return `(lower(source_path) LIKE ${p} || '%' OR lower(filename)=${p} OR lower(directory) LIKE ${p} || '%')`;
    }).join(' OR ') + ')');
    return this.results(await this.db.query(`SELECT record,1 AS score FROM knowledge_chunks WHERE ${clauses.join(' AND ')} ORDER BY chunk_id LIMIT ${bind(options.topK ?? 8)}`, values));
  }
  async domainSearch(domain, options = {}) {
    if (!domain || (options.domain && options.domain !== domain)) return [];
    const { values, clauses, bind } = this.filters({ ...options, domain });
    return this.results(await this.db.query(`SELECT record,1 AS score FROM knowledge_chunks WHERE ${clauses.join(' AND ')} ORDER BY chunk_id LIMIT ${bind(options.topK ?? 8)}`, values));
  }
  async healthCheck() {
    const server = (await this.db.query('SELECT version() AS version,current_database() AS name')).rows[0];
    const extension = (await this.db.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0]?.extversion ?? null;
    const table = (await this.db.query("SELECT to_regclass('knowledge_chunks') AS name")).rows[0]?.name ?? null;
    const indexes = table ? (await this.db.query("SELECT indexname FROM pg_indexes WHERE tablename='knowledge_chunks' AND schemaname=current_schema()")).rows.map(r => r.indexname) : [];
    const type = table ? (await this.db.query("SELECT format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid='knowledge_chunks'::regclass AND attname='embedding'")).rows[0]?.type : null;
    const stateTable = (await this.db.query("SELECT to_regclass('knowledge_index_state') AS name")).rows[0]?.name ?? null;
    const vectorStats = table ? (await this.db.query(`SELECT count(*)::int AS records,count(embedding)::int AS vectors,
      min(vector_dims(embedding)) AS min_dimensions,max(vector_dims(embedding)) AS max_dimensions,
      count(*) FILTER (WHERE embedding IS NULL)::int AS null_vectors FROM knowledge_chunks WHERE corpus_key=$1`,[this.key])).rows[0] : null;
    return { database: 'OK', postgres: server.version, database_name: server.name, pgvector: extension, table, stateTable, vectorType: type, vectorStats, indexes, missingIndexes: INDEX_NAMES.filter(n => !indexes.includes(n)) };
  }
  async assertCompatible() {
    const info = await this.healthCheck();
    if (!info.pgvector) throw new RagError('PGVECTOR_UNAVAILABLE','Extensão pgvector ausente; instale-a e execute knowledge:migrate.');
    if (!info.table || !info.stateTable || info.missingIndexes.length) throw new RagError('MIGRATION_REQUIRED','Tabelas ou índices ausentes; execute knowledge:migrate.');
    if (info.vectorType !== `vector(${this.dimensions})`) throw new RagError('DIMENSION_MISMATCH',`Coluna ${info.vectorType} incompatível com dimensão configurada ${this.dimensions}. Não houve escrita.`);
  }
}
