import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadCorpus } from './corpus.mjs';
import { localContext } from './local.mjs';

const corpus = loadCorpus();
test('busca local recupera símbolo e linhas sem provider', async () => {
  const result = await localContext(corpus, 'Como useTheme seleciona as cores?');
  assert.equal(result.status, 'CONTEXT_READY');
  assert.ok(result.sources.some(s => s.path === 'src/hooks/use-theme.ts'));
  assert.ok(result.sources.every(s => s.start_line > 0 && s.end_line >= s.start_line));
  assert.ok(result.context_token_upper_bound <= 12000);
  assert.equal(result.generation, 'CODEX_SESSION_REQUIRED');
});
test('busca local preserva filtros e distingue ausência de evidência', async () => {
  const result = await localContext(corpus, 'useTheme', { path: 'src/hooks/', sourceType: 'code', topK: 2 });
  assert.ok(result.sources.length > 0 && result.sources.length <= 2);
  assert.ok(result.sources.every(s => s.path.startsWith('src/hooks/')));
  assert.equal((await localContext(corpus, 'zzzzinexistente987654321')).status, 'NO_EVIDENCE');
  await assert.rejects(localContext(corpus, ''), { code: 'INVALID_QUERY' });
  await assert.rejects(localContext(corpus, 'useTheme', { topK: 0 }), { code: 'INVALID_QUERY' });
});
test('CLI local funciona com rede proibida e configuração externa inválida', () => {
  for (const args of [['health'], ['ingest'], ['ask', 'useTheme']]) {
    const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=.', 'scripts/rag/local-cli.mjs', ...args], {
      cwd: new URL('../..', import.meta.url), encoding: 'utf8',
      env: { ...process.env, OPENAI_API_KEY: '', DATABASE_URL: 'invalid', RAG_EMBEDDING_PROVIDER: 'invalid' },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'local-codex');
    assert.equal(output.generation, 'CODEX_SESSION_REQUIRED');
  }
});
