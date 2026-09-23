import { RagError } from './config.mjs';
import { analyzeQuery, reciprocalRankFusion, expandRelations, HeuristicReranker } from './retrieval.mjs';
import { ContextBuilder } from './context.mjs';
import { assertSafeText } from './corpus.mjs';

export class KnowledgeService {
  constructor({ corpus, store, embeddings, llm, config, reranker = new HeuristicReranker(), log = () => {} }) {
    Object.assign(this, { corpus, store, embeddings, llm, config, reranker, log });
    this.contextBuilder = new ContextBuilder(config);
  }
  async assertIndexed() {
    if (!this.config.enabled) throw new RagError('RAG_DISABLED', 'RAG_ENABLED=false.');
    const state = await this.store.state();
    if (!state || state.manifest_hash !== this.corpus.hash || state.embedding_model !== this.embeddings.model || state.embedding_dimensions !== this.embeddings.dimensions) {
      throw new RagError('INDEX_NOT_READY', 'Índice ausente, desatualizado ou incompatível; execute knowledge:api:ingest.');
    }
  }
  options(options) {
    const topK = options.topK ?? this.config.topK, minimumScore = options.minimumScore ?? this.config.minimumScore;
    if (!Number.isInteger(topK) || topK < 1 || topK > 100 || !Number.isFinite(minimumScore) || minimumScore < -1 || minimumScore > 1) throw new RagError('INVALID_QUERY', 'topK ou minimumScore inválido.');
    for (const key of ['domain','sourceType','path','symbol']) if (options[key] !== undefined && (typeof options[key] !== 'string' || options[key].length > 500)) throw new RagError('INVALID_QUERY', 'Filtro inválido.');
    if (options.sourceType && !['code','document'].includes(options.sourceType)) throw new RagError('INVALID_QUERY', 'sourceType inválido.');
    return { ...options, topK, minimumScore };
  }
  async semanticSearch(query, options = {}) {
    analyzeQuery(query, this.corpus); await this.assertIndexed();
    return this.store.search(await this.embeddings.embedText(query), this.options(options));
  }
  async searchKnowledge(query, options = {}) {
    const analysis = analyzeQuery(query, this.corpus); options = this.options(options);
    await this.assertIndexed();
    const candidateOptions = { ...options, topK: Math.max(this.config.rerankTopK, options.topK) };
    const vector = options.lexicalOnly ? null : await this.embeddings.embedText(query);
    const [semantic, lexical, symbol, path, domain] = await Promise.all([
      vector ? this.store.search(vector, candidateOptions) : [],
      this.store.lexicalSearch(analysis.lexicalQuery, candidateOptions),
      this.store.symbolSearch(analysis.symbols, candidateOptions),
      this.store.pathSearch(analysis.paths, candidateOptions),
      this.store.domainSearch(options.domain ?? analysis.domain, candidateOptions),
    ]);
    this.log('rag.retrieval.semantic', { count: semantic.length }); this.log('rag.retrieval.lexical', { count: lexical.length });
    const channels = { semantic, lexical, symbol, path, domain };
    const fused = reciprocalRankFusion(channels, analysis.weights).slice(0,this.config.rerankTopK);
    this.log('rag.retrieval.hybrid', { count: fused.length });
    const expanded = await expandRelations(fused, this.corpus, this.store, candidateOptions,
      { depth: this.config.relationDepth, maxChunks: this.config.maxRelatedChunks });
    this.log('rag.relations.expand', { count: expanded.added.length, depth: this.config.relationDepth });
    const ranked = await this.reranker.rerank(query, expanded.candidates, analysis);
    this.log('rag.rerank.complete', { count: ranked.length });
    return { query, analysis, strategy: options.lexicalOnly ? 'lexical-structural-rrf' : 'semantic-lexical-structural-rrf',
      channels, fusion: fused, expansion: expanded.added, relationships: expanded.relationships,
      ranking: ranked, results: ranked.slice(0,options.topK) };
  }
  async retrieveContext(query, options = {}) {
    const retrieval = await this.searchKnowledge(query, options);
    const context = this.contextBuilder.build(retrieval.ranking, retrieval.relationships);
    this.log('rag.context.complete', { count: context.sources.length, tokens: context.token_upper_bound });
    return { retrieval, context };
  }
  async answerWithKnowledge(query, options = {}) {
    const { retrieval, context } = await this.retrieveContext(query, options);
    if (!context.sources.length) return { question: query, retrieval, context, insufficient_evidence: true,
      answer: 'Não há informação suficiente na base recuperada para responder.', sources: [] };
    const generated = await this.llm.generate(query, context);
    if (typeof generated.insufficient_evidence !== 'boolean' || !Array.isArray(generated.statements) || !generated.statements.length) throw new RagError('INVALID_ANSWER', 'Resposta não possui afirmações estruturadas.');
    const allowed = new Map(context.sources.map(s => [s.id,s]));
    const cited = new Set();
    const lines = generated.statements.map(statement => {
      if (typeof statement.text !== 'string' || !statement.text.trim() || !Array.isArray(statement.source_ids) || (!generated.insufficient_evidence && !statement.source_ids.length)) throw new RagError('INVALID_CITATION', 'Afirmação sem fonte; resposta não publicada.');
      assertSafeText(statement.text);
      for (const id of statement.source_ids) {
        if (!allowed.has(id)) throw new RagError('INVALID_CITATION', 'O modelo citou uma fonte não recuperada; resposta não publicada.');
        cited.add(id);
      }
      return statement.text + (statement.source_ids.length ? ` [${statement.source_ids.join(', ')}]` : '');
    });
    this.log('rag.answer.complete', { count: cited.size });
    return { question: query, retrieval, context, insufficient_evidence: generated.insufficient_evidence,
      answer: lines.join('\n\n'), sources: [...cited].map(id => allowed.get(id)) };
  }
}
