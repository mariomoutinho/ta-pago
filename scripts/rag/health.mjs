import { ingestionPlan } from './ingest.mjs';
import { publicError } from './config.mjs';

export async function health({ corpus, store, service, embeddings, config }) {
  const report = { status: 'REQUIRES_EXTERNAL_CONFIGURATION', manifest: 'OK', chunks: corpus.chunks.length,
    database: 'NOT_CONFIGURED', pgvector: 'NOT_CHECKED', table: 'NOT_CHECKED',
    embedding_provider: config.embeddingProvider, embedding_model: embeddings.model, dimensions: embeddings.dimensions,
    provider: config.apiKey ? 'CONFIGURED_NOT_CHECKED' : 'NOT_CONFIGURED',
    llm: config.apiKey ? 'CONFIGURED_NOT_CHECKED' : 'NOT_CONFIGURED', llm_model: config.llmModel,
    blockers: [],
    stored_vectors: null, missing_vectors: null, orphan_vectors: null, stale_vectors: null,
    retrieval: { semantic: 'NOT_CHECKED', lexical: 'NOT_CHECKED', symbol: 'NOT_CHECKED', path: 'NOT_CHECKED', domain: 'NOT_CHECKED', hybrid: 'NOT_CHECKED' } };
  if (!store) { report.blockers.push('DATABASE_URL'); if (!config.apiKey) report.blockers.push('OPENAI_API_KEY'); return report; }
  try {
    Object.assign(report, await store.healthCheck());
    if (!report.pgvector || !report.table || !report.stateTable || report.missingIndexes.length) {
      report.status = 'MIGRATION_REQUIRED'; return report;
    }
    if (report.vectorType !== `vector(${config.dimensions})`) { report.status='DIMENSION_MISMATCH'; return report; }
    const stored = await store.listState(), plan = ingestionPlan(corpus.chunks,stored,embeddings);
    Object.assign(report, { stored_vectors: stored.length, missing_vectors: plan.new.length, orphan_vectors: plan.deleted.length, stale_vectors: plan.updated.length });
    let ready = true;
    try { await service.assertIndexed(); }
    catch (error) { ready=false; report.index=publicError(error); report.blockers.push('knowledge:ingest'); }
    if (!config.apiKey) report.blockers.unshift('OPENAI_API_KEY');
    // Checa o acesso aos dois modelos mesmo antes da primeira ingestão.
    if (config.apiKey) {
      try { await embeddings.embedText('Verificação de disponibilidade do RAG.'); report.provider='OK'; }
      catch(error) {report.provider=publicError(error); report.blockers.push('embedding_provider');}
      try {
        const probe=await service.llm.generate('Qual é o status informado na evidência?',{
          text:'SOURCE HEALTH\nVerificação técnica: provider disponível.',sources:[{id:'HEALTH'}],
        });
        const valid=probe.insufficient_evidence===false && probe.statements?.length && probe.statements.every(s=>typeof s.text==='string' && s.source_ids?.length && s.source_ids.every(id=>id==='HEALTH'));
        report.llm=valid?'OK':'INVALID_RESPONSE';
        if (!valid) report.blockers.push('llm_provider');
      } catch(error) {report.llm=publicError(error);report.blockers.push('llm_provider');}
    }
    if (!ready) {report.status=config.apiKey?'INDEX_NOT_READY':'REQUIRES_EXTERNAL_CONFIGURATION';return report;}
    const sample = corpus.chunks.find(c => c.symbol_type === 'hook') ?? corpus.chunks[0];
    const [lexical,symbol,path,domain] = await Promise.all([
      store.lexicalSearch(sample.symbol), store.symbolSearch([sample.symbol]), store.pathSearch([sample.source_path]), store.domainSearch(sample.domain),
    ]);
    for (const [name,value] of Object.entries({ lexical,symbol,path,domain })) report.retrieval[name] = value.length ? 'OK' : 'FAILED';
    if (config.apiKey && report.provider==='OK') {
      const retrieved = await service.searchKnowledge(sample.symbol);
      report.provider = 'OK'; report.retrieval.semantic = retrieved.channels.semantic.length ? 'OK' : 'FAILED';
      report.retrieval.hybrid = retrieved.results.length ? 'OK' : 'FAILED';
    }
    report.status = Object.values(report.retrieval).every(s => s === 'OK') && report.llm==='OK' && !plan.new.length && !plan.updated.length && !plan.deleted.length ? 'OK' : config.apiKey ? 'DEGRADED' : 'REQUIRES_EXTERNAL_CONFIGURATION';
  } catch (error) { report.error = publicError(error); report.status = report.error.status; }
  return report;
}
