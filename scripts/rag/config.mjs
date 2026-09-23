import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export class RagError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export const requireConfig = (name) => { throw new RagError('REQUIRES_EXTERNAL_CONFIGURATION', `Configure ${name}; consulte knowledge/RAG.md.`); };

export function loadConfig(env = process.env) {
  const integer = (name, fallback, min, max) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < min || value > max) throw new RagError('INVALID_CONFIGURATION', `${name} deve estar entre ${min} e ${max}.`);
    return value;
  };
  const flag = (name, fallback) => {
    const value = env[name] ?? fallback;
    if (!['true', 'false'].includes(value)) throw new RagError('INVALID_CONFIGURATION', `${name} deve ser true ou false.`);
    return value === 'true';
  };
  const minimumScore = Number(env.RAG_MIN_SCORE ?? 0.15);
  if (!Number.isFinite(minimumScore) || minimumScore < -1 || minimumScore > 1) throw new RagError('INVALID_CONFIGURATION', 'RAG_MIN_SCORE inválido.');
  if ((env.RAG_EMBEDDING_PROVIDER ?? 'openai') !== 'openai') throw new RagError('INVALID_CONFIGURATION', 'Provider de produção não suportado.');
  return {
    enabled: flag('RAG_ENABLED', 'true'), databaseUrl: env.DATABASE_URL,
    apiKey: env.OPENAI_API_KEY, embeddingProvider: 'openai',
    embeddingModel: env.RAG_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    dimensions: integer('RAG_EMBEDDING_DIMENSIONS', 1536, 1, 2000),
    llmModel: env.RAG_LLM_MODEL ?? 'gpt-4.1-mini',
    topK: integer('RAG_TOP_K', 8, 1, 100), rerankTopK: integer('RAG_RERANK_TOP_K', 30, 1, 100),
    maxChunks: integer('RAG_MAX_CHUNKS', 8, 1, 30),
    maxContextTokens: integer('RAG_MAX_CONTEXT_TOKENS', 12000, 256, 64000),
    minimumScore, relationDepth: integer('RAG_RELATION_DEPTH', 1, 0, 3),
    maxRelatedChunks: integer('RAG_MAX_RELATED_CHUNKS', 5, 0, 30),
    batchSize: integer('RAG_BATCH_SIZE', 16, 1, 64),
    timeoutMs: integer('RAG_TIMEOUT_MS', 60000, 1000, 180000), logs: flag('RAG_LOGS', 'true'),
  };
}

export function loadLocalEnvironment(root) {
  const path = resolve(root, '.env');
  if (existsSync(path)) process.loadEnvFile(path);
}

// Nunca aceitar texto livre, perguntas, SQL, URLs ou erros de providers no logger.
export function logger(enabled = true, sink = (line) => process.stderr.write(line + '\n')) {
  const fields = new Set(['count', 'new', 'updated', 'unchanged', 'deleted', 'embedded', 'duration_ms', 'depth', 'tokens']);
  return (event, data = {}) => {
    if (enabled && /^rag\.[a-z.]+$/.test(event)) sink(JSON.stringify({ event,
      ...Object.fromEntries(Object.entries(data).filter(([key, value]) => fields.has(key) && Number.isFinite(value))) }));
  };
}

export function publicError(error) {
  const databaseErrors = {
    ECONNREFUSED: ['DATABASE_UNAVAILABLE','PostgreSQL indisponível; inicie o banco local e confira host/porta.'],
    ENOTFOUND: ['DATABASE_UNAVAILABLE','Host do banco não encontrado; confira DATABASE_URL.'],
    '28P01': ['DATABASE_AUTHENTICATION_FAILED','Autenticação no PostgreSQL falhou; confira as credenciais locais.'],
    '42P01': ['MIGRATION_REQUIRED','Tabela do RAG ausente; execute knowledge:migrate.'],
  };
  if (databaseErrors[error.code]) return {status:databaseErrors[error.code][0],message:databaseErrors[error.code][1]};
  return error instanceof RagError ? { status: error.code, message: error.message }
    : { status: 'RAG_OPERATION_FAILED', message: 'Operação falhou. Verifique configuração, disponibilidade do banco e migration; detalhes externos foram omitidos para proteger credenciais.' };
}
