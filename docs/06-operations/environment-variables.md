---
{
  "id": "ta-pago.docs.06-operations.environment-variables",
  "title": "Variáveis de ambiente",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-23",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": true,
  "sources": [
    ".env.example",
    ".gitignore",
    "compose.rag.yaml",
    "scripts/rag/config.mjs",
    "src/components/external-link.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "3.0.1",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "operations"
}
---

# Variáveis de ambiente

## Inventário atual

Nenhuma variável de ambiente de negócio é exigida pelo aplicativo. `process.env.EXPO_OS` aparece no componente de links como seleção de plataforma fornecida pelo Expo. O RAG usa credenciais locais de ferramentas Node, separadas do aplicativo e mantidas fora do Git. Sua disponibilidade é verificada por `knowledge:health`.

## Política para futuras variáveis

Documentar nome, finalidade, obrigatoriedade, ambiente e responsável antes de introduzir uma variável. Valores públicos incorporados ao cliente nunca devem conter segredos. Credenciais de servidor devem permanecer fora do bundle e do Git.

O `.gitignore` exclui `.env` e `.env.*`, com exceção de `.env.example`. Criar exemplo somente quando houver variáveis reais necessárias, usando placeholders sem valores reais. Não indexar arquivos de ambiente na base de conhecimento.

## Variáveis do RAG local

O arquivo [.env.example](../../.env.example) lista as variáveis reais usadas por `scripts/rag/config.mjs`. `DATABASE_URL` conecta o banco, `OPENAI_API_KEY` autentica embeddings e geração, e `RAG_EMBEDDING_MODEL`, `RAG_EMBEDDING_DIMENSIONS` e `RAG_LLM_MODEL` selecionam modelos. `RAG_TOP_K`, `RAG_RERANK_TOP_K`, `RAG_MIN_SCORE`, `RAG_MAX_CHUNKS`, `RAG_MAX_CONTEXT_TOKENS`, `RAG_RELATION_DEPTH` e `RAG_MAX_RELATED_CHUNKS` limitam a recuperação e o contexto. `RAG_ENABLED=false` desabilita a CLI.

São variáveis de ferramentas Node, fora de `src/`, sem prefixo `EXPO_PUBLIC_`. A CLI lê `.env`; não imprime URLs, chaves ou erros brutos dos providers. Configuração e operação estão em [RAG.md](../../knowledge/RAG.md).
