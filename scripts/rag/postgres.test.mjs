import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PgVectorStore } from './store.mjs';
import { loadCorpus } from './corpus.mjs';
import { ingest } from './ingest.mjs';
import { TestEmbeddings } from './testing/fixtures.mjs';

test('PostgreSQL servidor: migration, ingestão concorrente, filtros e rollback', {
  skip: !process.env.RAG_TEST_DATABASE_URL && 'Defina RAG_TEST_DATABASE_URL para um banco dedicado cujo nome termine em _test.',
}, async t => {
  const url = new URL(process.env.RAG_TEST_DATABASE_URL);
  assert(url.pathname.endsWith('_test'), 'Proteção: banco precisa terminar em _test');
  const schema = `rag_test_${process.pid}_${Date.now()}`;
  const admin = new pg.Pool({connectionString:url.toString()});
  let pool, created = false;
  t.after(async()=>{
    try { await pool?.end(); if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`); }
    finally { await admin.end(); }
  });
  await admin.query('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public');
  await admin.query(`CREATE SCHEMA ${schema}`);
  created = true;
  pool = new pg.Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`});
  const corpus=loadCorpus(),provider=new TestEmbeddings(),store=new PgVectorStore(pool,corpus.key,provider.dimensions);
  await store.migrate();await store.migrate();
  const results=await Promise.all([ingest(corpus,store,provider),ingest(corpus,store,provider)]);
  assert.equal(results.reduce((sum,r)=>sum+r.embedded,0),corpus.chunks.length);
  assert.equal((await store.listState()).length,corpus.chunks.length);
  assert((await store.lexicalSearch('Collapsible')).length>0);
  const exact=await store.symbolSearch(['useTheme']);assert.equal(exact[0].chunk.source_path,'src/hooks/use-theme.ts');
  assert.deepEqual((await store.healthCheck()).missingIndexes,[]);
  await assert.rejects(new PgVectorStore(pool,corpus.key,16).assertCompatible(),{code:'DIMENSION_MISMATCH'});
  const changed=structuredClone(corpus);
  changed.hash='fixture-update';changed.chunks[0].index_hash='fixture-update';changed.chunks[0].content+='\nTeste controlado de incrementalidade.';
  const updated=await ingest(changed,store,provider);assert.equal(updated.updated,1);assert.equal(updated.embedded,1);
  changed.chunks.shift();changed.hash='fixture-deletion';
  const deleted=await ingest(changed,store,provider);assert.equal(deleted.deleted,1);assert.equal(deleted.embedded,0);
  assert.equal((await store.listState()).length,corpus.chunks.length-1);
  await ingest(corpus,store,provider);
  await assert.rejects(store.transaction(async tx=>{await tx.delete([corpus.chunks[0].chunk_id]);throw Error('rollback test');}));
  assert.equal((await store.listState()).length,corpus.chunks.length);
});
