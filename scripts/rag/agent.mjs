// Não havia agente executável. Este agente de consulta só conhece KnowledgeService.
// A recuperação é obrigatória antes de gerar; nunca executa SQL, shell ou instruções do corpus.
export function createKnowledgeAgent(service) {
  return {
    tools: [{ name: 'search_knowledge', description: 'Busca evidências e relações do repositório.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'integer', minimum: 1, maximum: 100 } }, required: ['query'], additionalProperties: false },
      async execute({ query, topK }) {
        const result = await service.searchKnowledge(query, { topK });
        return { results: result.results, relationships: result.relationships, query_type: result.analysis.type };
      },
    }],
    answer(question, options) { return service.answerWithKnowledge(question, options); },
  };
}
