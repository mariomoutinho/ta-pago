import { parseArgs } from 'node:util';
import { loadCorpus } from './corpus.mjs';
import { localContext } from './local.mjs';
import { publicError, RagError } from './config.mjs';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    'top-k': { type: 'string' }, path: { type: 'string' }, 'source-type': { type: 'string' }, 'dry-run': { type: 'boolean' },
  } });
  const [command, ...question] = positionals;
  if (!['health', 'ingest', 'search', 'context', 'ask'].includes(command)) throw new RagError('INVALID_COMMAND', 'Use health, ingest, search, context ou ask.');
  const corpus = loadCorpus();
  const result = ['health', 'ingest'].includes(command)
    ? { status: 'LOCAL_RETRIEVAL_READY', mode: 'local-codex', chunks: corpus.chunks.length, manifest: 'OK',
      network_requests: 0, database_required: false, api_key_required: false, embeddings: 'NOT_USED',
      generation: 'CODEX_SESSION_REQUIRED', persisted: false,
      message: 'Catálogo validado; índice em memória reconstruído a cada busca. A resposta é elaborada pelo Codex na sessão.' }
    : await localContext(corpus, question.join(' '), { topK: values['top-k'] === undefined ? 8 : Number(values['top-k']),
      path: values.path, sourceType: values['source-type'] });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify(publicError(error), null, 2) + '\n');
  process.exitCode = 2;
}
