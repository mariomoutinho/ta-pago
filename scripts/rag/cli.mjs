import { parseArgs } from 'node:util';
import { ROOT, readJSON } from '../knowledge/common.mjs';
import { loadConfig, loadLocalEnvironment, logger, publicError, RagError, requireConfig } from './config.mjs';
import { loadCorpus } from './corpus.mjs';
import { PgVectorStore } from './store.mjs';
import { OpenAIEmbeddingProvider, OpenAIAnswerProvider } from './providers.mjs';
import { ingest } from './ingest.mjs';
import { KnowledgeService } from './service.mjs';
import { createKnowledgeAgent } from './agent.mjs';
import { evaluate } from './evaluate.mjs';
import { health } from './health.mjs';

const print = value => process.stdout.write(JSON.stringify(value,null,2)+'\n');
const compact = candidate => ({ chunk_id: candidate.chunk.chunk_id, symbol: candidate.chunk.symbol, source: candidate.source,
  score: candidate.score, channels: candidate.channels, metadata: candidate.chunk.metadata });
function debug(retrieval, context) {
  return { query: retrieval.query, query_type: retrieval.analysis.type, retrieval_strategy: retrieval.strategy,
    channels: Object.fromEntries(Object.entries(retrieval.channels).map(([k,v]) => [k,v.map(compact)])),
    rrf: retrieval.fusion.map(compact), relation_expansion: retrieval.expansion.map(compact), relationships: retrieval.relationships,
    reranker: retrieval.ranking.map(compact), final_selected_chunks: context.sources, context_token_upper_bound: context.token_upper_bound };
}
let store;
try {
  loadLocalEnvironment(ROOT);
  const config = loadConfig(), log = logger(config.logs);
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    'dry-run': { type: 'boolean' }, 'lexical-only': { type: 'boolean' }, 'top-k': { type: 'string' },
    domain: { type: 'string' }, 'source-type': { type: 'string' }, path: { type: 'string' }, symbol: { type: 'string' },
    'minimum-score': { type: 'string' },
  } });
  const [command,...question] = positionals;
  if (!['migrate','ingest','search','ask','health','evaluate'].includes(command)) throw new RagError('INVALID_COMMAND', 'Use migrate, ingest, search, ask, health ou evaluate.');
  if (!config.enabled) throw new RagError('RAG_DISABLED', 'RAG_ENABLED=false.');
  const corpus = loadCorpus();
  const embeddings = new OpenAIEmbeddingProvider(config, undefined, log), llm = new OpenAIAnswerProvider(config);
  if (config.databaseUrl) store = PgVectorStore.connect(config,corpus.key);
  const service = new KnowledgeService({ corpus, store, embeddings, llm, config, log });
  const options = { lexicalOnly: values['lexical-only'] ?? false,
    ...(values['top-k'] ? { topK: Number(values['top-k']) } : {}),
    ...(values['minimum-score'] ? { minimumScore: Number(values['minimum-score']) } : {}),
    ...Object.fromEntries(['domain','path','symbol'].filter(k => values[k]).map(k => [k,values[k]])),
    ...(values['source-type'] ? { sourceType: values['source-type'] } : {}),
  };
  if (command === 'health') {
    const result = await health({ corpus, store, service, embeddings, config }); print(result);
    if (result.status !== 'OK') process.exitCode = 2;
  } else {
    if (!store) requireConfig('DATABASE_URL');
    if ((command === 'ask' || (['search','evaluate'].includes(command) && !options.lexicalOnly)) && !config.apiKey) requireConfig('OPENAI_API_KEY');
    if (command === 'migrate') { await store.migrate(); print({ status: 'MIGRATED', dimensions: config.dimensions }); }
    if (command === 'ingest') print(await ingest(corpus,store,embeddings,{ dryRun: values['dry-run'], batchSize: config.batchSize, log }));
    if (command === 'evaluate') print(await evaluate(service,readJSON(ROOT,'knowledge/evaluation/questions.json'),options));
    if (command === 'search') {
      const { retrieval,context } = await service.retrieveContext(question.join(' '),options); print(debug(retrieval,context));
    }
    if (command === 'ask') {
      const result = await createKnowledgeAgent(service).answer(question.join(' '),options);
      print({ QUESTION: result.question,
        QUERY_TYPE: result.retrieval.analysis.type,
        RETRIEVAL_STRATEGY: result.retrieval.strategy,
        SEMANTIC_RESULTS: result.retrieval.channels.semantic.map(compact),
        LEXICAL_STRUCTURAL_RESULTS: Object.fromEntries(['lexical','symbol','path','domain'].map(k => [k,result.retrieval.channels[k].map(compact)])),
        RELATIONSHIPS: result.retrieval.relationships,
        RETRIEVED_SOURCES: result.retrieval.results.map(compact),
        FINAL_CONTEXT_SOURCES: result.context.sources, ANSWER: result.answer,
        CITATIONS: result.sources, insufficient_evidence: result.insufficient_evidence });
    }
  }
} catch (error) { print(publicError(error)); process.exitCode = 2; }
finally { await store?.close(); }
