import { RagError } from './config.mjs';

export function validateQuestions(questions, corpus) {
  if (!Array.isArray(questions) || !questions.length) throw new RagError('INVALID_EVALUATION', 'Dataset vazio.');
  const ids = new Set();
  for (const q of questions) {
    if (!q.id || ids.has(q.id) || !q.question || !Array.isArray(q.expectedSources) || !q.expectedSources.length || !Array.isArray(q.expectedSymbols)) throw new RagError('INVALID_EVALUATION', 'Caso incompleto ou duplicado.');
    ids.add(q.id);
    for (const path of q.expectedSources) if (!corpus.chunks.some(c => c.source_path === path)) throw new RagError('INVALID_EVALUATION', 'Fonte esperada não existe no corpus.');
    for (const symbol of q.expectedSymbols) if (!corpus.chunks.some(c => c.symbol === symbol)) throw new RagError('INVALID_EVALUATION', 'Símbolo esperado não existe no corpus.');
  }
}

export async function evaluate(service, questions, options = {}) {
  validateQuestions(questions, service.corpus);
  const cases = [];
  for (const q of questions) {
    const result = await service.searchKnowledge(q.question, { ...options, topK: 100 });
    // Unidade de relevância: arquivos únicos. Vários chunks do mesmo arquivo não inflacionam recall.
    const rankedSources = [...new Set(result.ranking.map(r => r.chunk.source_path))];
    const relevant = new Set(q.expectedSources);
    const rank = rankedSources.findIndex(path => relevant.has(path));
    const recalls = Object.fromEntries([1,3,5].map(k => [`Recall@${k}`, rankedSources.slice(0,k).filter(path => relevant.has(path)).length / relevant.size]));
    const symbols = new Set(result.ranking.slice(0,5).map(r => r.chunk.symbol));
    cases.push({ id: q.id, ...recalls, reciprocal_rank: rank < 0 ? 0 : 1/(rank+1), rankedSources: rankedSources.slice(0,5),
      symbol_recall_at_5: q.expectedSymbols.length ? q.expectedSymbols.filter(s => symbols.has(s)).length/q.expectedSymbols.length : null });
  }
  return { mode: options.lexicalOnly ? 'lexical-structural (sem embeddings)' : 'hybrid', questions: cases.length,
    ...Object.fromEntries(['Recall@1','Recall@3','Recall@5'].map(metric => [metric,cases.reduce((sum,c) => sum+c[metric],0)/cases.length])),
    MRR: cases.reduce((sum,c) => sum+c.reciprocal_rank,0)/cases.length, cases };
}
