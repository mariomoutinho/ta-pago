import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadConfig, logger, publicError } from './config.mjs';
import { loadCorpus, assertSafeText, assertSourcePath } from './corpus.mjs';
import { analyzeQuery, reciprocalRankFusion, expandRelations } from './retrieval.mjs';
import { ContextBuilder } from './context.mjs';
import { KnowledgeService } from './service.mjs';
import { createKnowledgeAgent } from './agent.mjs';
import { ingest } from './ingest.mjs';
import { evaluate, validateQuestions } from './evaluate.mjs';
import { health } from './health.mjs';
import { TestEmbeddings, testStore } from './testing/fixtures.mjs';
import { OpenAIEmbeddingProvider, OpenAIAnswerProvider, OpenAITransport, segments, validateVector } from './providers.mjs';

const config = loadConfig({ RAG_LOGS: 'false', RAG_EMBEDDING_DIMENSIONS: '32' });

test('segurança: configurações, exclusões, segredos e logs', () => {
  for (const path of ['.env','src/.env','node_modules/a.ts','src/generated/a.ts','src/credentials/a.ts','src/credentials.ts','src/foo.test.ts','src/test.d.ts','build/index.ts','.git/config','src/../secret.ts','src/a\\secret.ts']) assert.throws(() => assertSourcePath(path));
  for (const value of ['sk-'+'a'.repeat(30),'-----BEGIN PRIVATE KEY-----','password="test-value-secret"','123.456.789-00','person'+'@example.org','+5511999999999']) assert.throws(() => assertSafeText(value));
  assert.throws(() => loadConfig({RAG_EMBEDDING_PROVIDER:'fake'}));
  assert.throws(() => loadConfig({RAG_MIN_SCORE:'NaN'}));
  assert.throws(() => loadConfig({RAG_TOP_K:'-1'}));
  const lines = []; logger(true,line => lines.push(line))('rag.ingest.start',{count:2,apiKey:'do-not-log',query:'private text'});
  assert.deepEqual(JSON.parse(lines[0]),{event:'rag.ingest.start',count:2});
  assert(!JSON.stringify(publicError(new Error('password=secret'))).includes('password'));
});

test('embeddings validam dimensões, valores, ordenação e segmentação real', async () => {
  for (const v of [[0,0],[1,NaN],[1]]) assert.throws(() => validateVector(v,2));
  const pieces = segments('Olá 🌎 '.repeat(3000));
  assert(pieces.every(p => Buffer.byteLength(p)<=6000)); assert.equal(pieces.join(''),'Olá 🌎 '.repeat(3000));
  const transport = { async post(endpoint,body) {
    assert.equal(endpoint,'embeddings'); assert.equal(body.dimensions,2);
    return {data:body.input.map((_,index)=>({index,embedding:[1,2]})).reverse()};
  } };
  const provider = new OpenAIEmbeddingProvider({...config,dimensions:2},transport);
  const vectors = await provider.embedBatch(['primeiro','texto grande '.repeat(1000)]);
  assert.equal(vectors.length,2); assert(Math.abs(Math.hypot(...vectors[1])-1)<1e-10);
  const broken = new OpenAIEmbeddingProvider({...config,dimensions:2},{post:async()=>({data:[]})});
  await assert.rejects(broken.embedText('texto'),{code:'INVALID_EMBEDDING'});
});

test('HTTP real é exigido em produção; falhas externas não vazam credenciais', async () => {
  await assert.rejects(new OpenAITransport(config).post('embeddings',{}),{code:'REQUIRES_EXTERNAL_CONFIGURATION'});
  const transport = new OpenAITransport({...config,apiKey:'test-placeholder'},async()=>({ok:false,status:401}));
  await assert.rejects(transport.post('embeddings',{}),error => error.code==='PROVIDER_ERROR' && !error.message.includes('test-placeholder'));
  let calls=0;
  const retry = new OpenAITransport({...config,apiKey:'test-placeholder'},async()=>++calls<2?{status:503}:{ok:true,json:async()=>({ok:true})});
  assert.deepEqual(await retry.post('embeddings',{}),{ok:true}); assert.equal(calls,2);
});

test('RRF usa posições e deduplica canal, sem somar escores incompatíveis', () => {
  const a={chunk:{chunk_id:'a'},score:1e6},b={chunk:{chunk_id:'b'},score:0.2};
  const result = reciprocalRankFusion({semantic:[a,b],lexical:[b,b]},{semantic:1,lexical:1});
  assert.equal(result[0].chunk.chunk_id,'b'); assert(Math.abs(result[0].score-(1/62+1/61))<1e-10);
});

test('pipeline integrado em PostgreSQL/pgvector WASM com corpus real e providers exclusivos de teste', async t => {
  const corpus=loadCorpus(), store=await testStore(corpus.key), embeddings=new TestEmbeddings();
  t.after(()=>store.close());
  const service=new KnowledgeService({corpus,store,embeddings,config,llm:{generate:async()=>{throw new Error('Teste exige substituição explícita.');}}});
  await t.test('migration idempotente e sete índices reais',async()=>{
    await store.migrate(); const h=await store.healthCheck(); assert(h.pgvector);assert.deepEqual(h.missingIndexes,[]);
  });
  await t.test('primeira ingestão, reexecução, dry-run, alteração única e remoção',async()=>{
    const dry=await ingest(corpus,store,embeddings,{dryRun:true});assert.equal(dry.new,corpus.chunks.length);assert.equal(embeddings.calls,0);assert.equal((await store.listState()).length,0);
    const first=await ingest(corpus,store,embeddings);assert.equal(first.embedded,corpus.chunks.length);
    const same=await ingest(corpus,store,embeddings);assert.equal(same.unchanged,corpus.chunks.length);assert.equal(same.embedded,0);
    const changed=structuredClone(corpus);changed.chunks[0].content+='\nTeste de atualização.';changed.chunks[0].index_hash='updated';changed.hash='changed';
    const before=embeddings.calls;assert.equal((await ingest(changed,store,embeddings,{dryRun:true})).updated,1);assert.equal(embeddings.calls,before);
    const update=await ingest(changed,store,embeddings);assert.equal(update.updated,1);assert.equal(update.embedded,1);
    changed.chunks.shift();const deletion=await ingest(changed,store,embeddings);assert.equal(deletion.deleted,1);assert.equal(deletion.embedded,0);
    assert.equal((await store.listState()).length,corpus.chunks.length-1);
    await ingest(corpus,store,embeddings);
  });
  await t.test('rollback mantém vetores e estado se provider falha no meio da ingestão',async()=>{
    const before=await store.state(),changed=structuredClone(corpus);changed.chunks[0].index_hash='failure';changed.chunks[1].index_hash='failure';changed.hash='failure';
    const broken=new TestEmbeddings();let batches=0;const embed=broken.embedBatch.bind(broken);broken.embedBatch=async texts=>{if(++batches===2)throw Error('fixture failure');return embed(texts);};
    await assert.rejects(ingest(changed,store,broken,{batchSize:1}));assert.deepEqual(await store.state(),before);
    assert.equal((await ingest(corpus,store,embeddings,{dryRun:true})).updated,0);
  });
  await t.test('mudança de modelo invalida vetores; consulta recusa índice incompatível',async()=>{
    const different=new TestEmbeddings();different.model='test-only-v2';const plan=await ingest(corpus,store,different,{dryRun:true});assert.equal(plan.updated,corpus.chunks.length);
    const other=new KnowledgeService({corpus,store,embeddings:different,config});await assert.rejects(other.searchKnowledge('useTheme'),{code:'INDEX_NOT_READY'});
  });
  await t.test('semanticSearch encontra o vetor do próprio texto e aplica filtros/minimumScore',async()=>{
    const chunk=corpus.chunks.find(c=>c.symbol==='useTheme');const v=await embeddings.embedText(`${chunk.source_path}\n${chunk.symbol}\n${chunk.domain}\n${chunk.content}`);
    const found=await store.search(v,{topK:1,symbol:'useTheme',minimumScore:0.99});assert.equal(found[0].chunk.chunk_id,chunk.chunk_id);
    assert.deepEqual(await store.search(v,{domain:'nonexistent',minimumScore:-1}),[]);
    assert.deepEqual(await store.search(v,{path:'src/hooks/%',minimumScore:-1}),[]);
  });
  await t.test('busca lexical, símbolo, caminho, domínio e fontes reais',async()=>{
    assert((await store.lexicalSearch('Collapsible')).some(r=>r.chunk.source_path==='src/components/ui/collapsible.tsx'));
    assert((await store.symbolSearch(['useTheme'])).every(r=>r.chunk.symbol==='useTheme'));
    assert((await store.pathSearch(['use-theme.ts'])).length>0);
    assert((await store.pathSearch(['src/hooks/'])).every(r=>r.chunk.source_path.startsWith('src/hooks/')));
    assert.equal((await store.symbolSearch(["x' OR 1=1--"])).length,0);
    const result=await service.searchKnowledge('Como Collapsible alterna o conteúdo?',{lexicalOnly:true});
    assert.equal(result.results[0].chunk.source_path,'src/components/ui/collapsible.tsx');
    assert(result.results[0].source.start_line>0);assert(result.results[0].channels.symbol);
  });
  await t.test('relações de useTheme chegam a consumidores, sem ciclos e respeitando filtros',async()=>{
    const initial=await store.symbolSearch(['useTheme']);const expanded=await expandRelations(initial,corpus,store,{}, {depth:2,maxChunks:5});
    assert(expanded.added.length>0 && expanded.added.length<=5);assert.equal(new Set(expanded.candidates.map(c=>c.chunk.chunk_id)).size,expanded.candidates.length);
    assert(expanded.added.some(c=>c.chunk.source_path.startsWith('src/components/')));
    const filtered=await expandRelations(initial,corpus,store,{path:'src/hooks/'},{depth:2,maxChunks:5});assert(filtered.added.every(c=>c.chunk.source_path.startsWith('src/hooks/')));
  });
  await t.test('query analyzer escolhe estratégia e rejeita perguntas inválidas',()=>{
    assert.equal(analyzeQuery('Onde useTheme é utilizado?',corpus).type,'symbol_lookup');
    assert.equal(analyzeQuery('Qual a arquitetura?',corpus).type,'architecture');
    assert(analyzeQuery('Qual rota /explore?',corpus).symbols.includes('/explore'));
    assert.deepEqual(analyzeQuery('arquivo src/hooks/use-theme.ts',corpus).paths,['src/hooks/use-theme.ts']);
    assert.throws(()=>analyzeQuery('',corpus));
  });
  await t.test('contexto deduplica, preserva citações e respeita orçamento com Unicode',async()=>{
    const results=(await service.searchKnowledge('Collapsible',{lexicalOnly:true})).ranking;
    const builder=new ContextBuilder({maxChunks:3,maxContextTokens:1800});const ctx=builder.build([...results,...results]);
    assert(ctx.sources.length>0 && ctx.sources.length<=3);assert(Buffer.byteLength(ctx.text)<=1800);
    assert.equal(new Set(ctx.sources.map(s=>s.chunk_id)).size,ctx.sources.length);assert(ctx.text.includes('SOURCE S1'));
    const parent=results.find(r=>r.chunk.symbol==='Collapsible'),handler=results.find(r=>r.chunk.symbol==='Collapsible/callback:onPress');
    assert.equal(new ContextBuilder().build([parent,handler]).sources.length,1);
  });
  await t.test('agente completa query → retrieval → contexto → provider → resposta com citações verificadas',async()=>{
    let received;
    // Resposta fixture: comprova integração, não é demonstração de geração por LLM real.
    const transport={async post(endpoint,body){received=body;assert.equal(endpoint,'responses');assert(body.instructions.includes('Não exponha raciocínio interno'));
      const payload=JSON.parse(body.input);assert(payload.evidence.includes('setIsOpen'));
      return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({insufficient_evidence:false,statements:[{text:'Collapsible alterna isOpen no onPress e renderiza children quando aberto.',source_ids:['S1']}]})}]}]};
    }};
    service.llm=new OpenAIAnswerProvider(config,transport);
    const agent=createKnowledgeAgent(service);const answer=await agent.answer('Como Collapsible alterna o conteúdo?',{lexicalOnly:true});
    assert(received);assert(answer.answer.includes('[S1]'));assert.equal(answer.sources[0].path,'src/components/ui/collapsible.tsx');
    assert((await agent.tools[0].execute({query:'useTheme',topK:3})).results.length<=3);
    service.llm={generate:async()=>({insufficient_evidence:false,statements:[{text:'Inventada',source_ids:['S999']}]})};
    await assert.rejects(service.answerWithKnowledge('Collapsible',{lexicalOnly:true}),{code:'INVALID_CITATION'});
    service.llm={generate:async()=>({insufficient_evidence:false,statements:[{text:'Sem fonte',source_ids:[]}]})};
    await assert.rejects(service.answerWithKnowledge('Collapsible',{lexicalOnly:true}),{code:'INVALID_CITATION'});
  });
  await t.test('contexto vazio declara insuficiência sem chamar LLM',async()=>{
    service.llm={generate:async()=>{throw Error('não deveria ser chamado');}};
    const answer=await service.answerWithKnowledge('Collapsible',{lexicalOnly:true,domain:'nonexistent'});assert(answer.insufficient_evidence);assert.deepEqual(answer.sources,[]);
  });
  await t.test('golden dataset: avaliação lexical/estrutural real, sem alegar qualidade semântica',async()=>{
    const questions=JSON.parse(readFileSync(new URL('../../knowledge/evaluation/questions.json',import.meta.url)));
    validateQuestions(questions,corpus);assert.equal(questions.length,20);
    const result=await evaluate(service,questions,{lexicalOnly:true});
    t.diagnostic(JSON.stringify({mode:result.mode,questions:result.questions,'Recall@1':result['Recall@1'],'Recall@3':result['Recall@3'],'Recall@5':result['Recall@5'],MRR:result.MRR}));
    assert(result['Recall@5']>=0.7);assert(result.MRR>0.5);
  });
  await t.test('health calcula valores reais e não afirma provider real sem chave',async()=>{
    const report=await health({corpus,store,service,embeddings,config});assert.equal(report.stored_vectors,corpus.chunks.length);assert.equal(report.missing_vectors,0);assert.equal(report.orphan_vectors,0);
    assert.equal(report.retrieval.lexical,'OK');assert.equal(report.provider,'NOT_CONFIGURED');assert.equal(report.status,'REQUIRES_EXTERNAL_CONFIGURATION');
  });
  await t.test('health não retorna OK quando geração falha e confirma ambos providers quando passam',async()=>{
    const enabled={...config,apiKey:true};
    service.llm={generate:async()=>{throw Error('provider fixture failure');}};
    const failed=await health({corpus,store,service,embeddings,config:enabled});
    assert.notEqual(failed.status,'OK');assert.notEqual(failed.llm,'OK');
    service.llm={generate:async()=>({insufficient_evidence:false,statements:[{text:'Disponível',source_ids:['HEALTH']}]})};
    const passed=await health({corpus,store,service,embeddings,config:enabled});assert.equal(passed.status,'OK');assert.equal(passed.llm,'OK');
  });
});
