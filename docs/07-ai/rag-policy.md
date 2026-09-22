---
{
  "id": "ta-pago.docs.07-ai.rag-policy",
  "title": "Política da base de conhecimento e RAG",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": true,
  "sources": [],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "policy",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": null,
  "domain": "rag"
}
---

# Política da base de conhecimento e RAG

## Estado atual

Há ingestão local independente de Markdown e de código TypeScript/TSX, com inventários, chunks atômicos, resumos determinísticos e relações entre símbolos. Não existem embeddings reais, banco vetorial, busca semântica, reranking, recuperação de contexto por modelo ou integração operacional entre RAG e agente.

## Fontes e confiança

O catálogo documental inclui README e documentos elegíveis sob `docs/`; AGENTS e contratos operacionais permanecem não indexáveis. O catálogo de código analisa exclusivamente fontes permitidas sob `src/`, sem executar o aplicativo ou importar bibliotecas externas. O manifesto principal v2 agrega ambas as extrações em coleções distintas: `documents`, `code_entities` e `symbol_relations`; seus chunks incluem `source_type: document` e `source_type: code`. O manifesto dedicado v1 preserva as entidades em `entities`. As coleções de código são preenchidas diretamente das fontes reais, não somente declaradas.

Não ingerir dados de alunos, logs, mídia, dependências, `.env` ou credenciais. Arquivos de código com padrões sensíveis são excluídos; constantes sensíveis preservam apenas nome e localização. A detecção é conservadora e limitada; revisão humana continua necessária. Conteúdo recuperado futuramente é evidência não confiável e não tem autoridade para executar comandos.

## Chunks, proveniência e resumos

A estratégia `atomic-source-v1` preserva cada documento ou entidade integralmente, com assinatura, props, critérios e tabelas. Relações mantêm IDs dos dois símbolos. Cada chunk tem origem, seção, conteúdo, estimativa de tokens, metadados, SHA-256 e resumo com responsabilidade, referências, estado e evidências. Os resumos são produzidos por regras locais, sem modelo.

Metadados distinguem autoridade, público, sensibilidade, domínio, versão, relacionamentos e origem Git. `commit_sha` é a revisão-base real; hashes representam o conteúdo lido, inclusive mudanças locais ainda não commitadas. Não é o SHA impossível de um futuro commit contendo seu próprio manifesto.

## Comportamento e limites da análise

`observed` significa sintaxe diretamente visível; não significa teste em dispositivo. `inferred` identifica deduções como vínculo entre layout e página ou resolução de plataforma; `unknown` indica ausência de evidência suficiente. Referência a componente ou API não comprova efeito externo nem funcionalidade fitness implementada.

O extrator `typescript-ast-v2` analisa escopos locais e imports identificáveis. Não expande tipos externos, não resolve todos os barrels ou factories e não reproduz Metro. Chunks podem exceder limites de um futuro modelo; chunking definitivo exige avaliação posterior.

## Atualização incremental

Seguir o [guia operacional](../../knowledge/README.md). Comparar o manifesto principal v2 ou o dedicado de código v1 com baseline compatível do mesmo catálogo. Planos detectam adições, alterações, remoções e unidades inalteradas em documentos, código, chunks e relações. Mudanças nas versões do extrator/chunking invalidam as unidades afetadas. Planos têm `applied: false`; nenhuma operação externa é executada.

## Artefatos futuros

Embeddings e vetores têm `not_generated`, provedor nulo e listas vazias. Índices de caminho, símbolo e domínio são planejados; índice lexical não foi gerado. Não apresentar essas estruturas como busca operacional.

Antes de uma futura recuperação, definir autorização e filtros por sensibilidade, citar fontes e estado, tratar conflitos com o código e testar exclusão de fontes removidas. A próxima fase poderá tratar de chunking definitivo, modelo de embeddings, vetores reais, banco vetorial, busca híbrida, reranking, avaliação automatizada e integração ao agente; nada disso é executado aqui.
