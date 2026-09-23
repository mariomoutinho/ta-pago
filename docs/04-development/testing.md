---
{
  "id": "ta-pago.docs.04-development.testing",
  "title": "Estratégia de testes",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": [
    "knowledge/evaluation/questions.json",
    "scripts/rag/postgres.test.mjs",
    "scripts/rag/rag.test.mjs"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "3.0.0",
  "authority": "policy",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.01-requirements.acceptance-criteria"
  ],
  "framework_version": null,
  "domain": "testing"
}
---

# Estratégia de testes

## Verificações disponíveis

| Comando | O que comprova |
| --- | --- |
| `npm run typecheck` | Verificação estática de tipos do aplicativo. |
| `npm run docs:validate` | Metadados, fontes locais, links locais por arquivo, título e IDs únicos. |
| `npm run docs:test` | Regressões dos validadores e planejamento incremental com casos negativos. |
| `npm run knowledge:check` | Manifesto versionado idêntico ao catálogo calculado dos documentos. |

A validação de links não acessa URLs externas nem verifica âncoras de títulos. A CI documental não substitui testes do aplicativo. Não há suíte funcional ou end-to-end do produto configurada.

## Testes futuros

Para cada funcionalidade, partir dos [critérios de aceitação](../01-requirements/acceptance-criteria.md). Cobrir permissões, repetição de operações, falhas de rede e paridade entre plataformas. Testar interface com teclado, leitor de tela e texto ampliado.

## Evidência de entrega

Registrar comandos e resultados, ambiente e limitações. Tipo correto não comprova comportamento de negócio ou funcionamento em dispositivo.

## Verificações do inventário de código

`npm run code:test` testa componentes, hooks, rotas, funções, constantes, relações, confiança, exclusões sensíveis e planos incrementais. `npm run code:check` compara inventário e manifesto com as fontes atuais, incluindo chunks e resumos. Os testes usam fontes sintéticas em diretórios temporários e não dados reais de alunos.

A CI instala dependências e executa TypeScript, documentos e código. Não configura nem executa o lint incompleto do template. A análise sintática não substitui testes de comportamento em Android, iOS ou web.

## Testes de RAG

`npm run rag:test` verifica SQL PostgreSQL/pgvector em PGlite, incrementalidade, rollback, filtros, RRF, relações, contexto e integração do agente com respostas fixture. O provider determinístico existe somente em `scripts/rag/testing`; a CLI de produção não o seleciona. A suíte com servidor PostgreSQL usa `RAG_TEST_DATABASE_URL` e exige um banco dedicado terminado em `_test`; sem essa variável, apenas esse teste fica skipped. A CI fornece o serviço isolado.

`npm test` reúne documentos, código e RAG. `knowledge:evaluate` mede retrieval real com o dataset de 20 perguntas; `--lexical-only` separa a avaliação lexical/estrutural da semântica. Métricas de fixtures não validam qualidade de embeddings ou respostas reais. Consulte [RAG.md](../../knowledge/RAG.md).
