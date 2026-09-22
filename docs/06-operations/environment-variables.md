---
{
  "id": "ta-pago.docs.06-operations.environment-variables",
  "title": "Variáveis de ambiente",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": true,
  "sources": [
    "src/components/external-link.tsx",
    ".gitignore"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
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

Nenhuma variável de ambiente de negócio é exigida pelo aplicativo. `process.env.EXPO_OS` aparece no componente de links como seleção de plataforma fornecida pelo Expo. Não há credencial de backend ou RAG configurada.

## Política para futuras variáveis

Documentar nome, finalidade, obrigatoriedade, ambiente e responsável antes de introduzir uma variável. Valores públicos incorporados ao cliente nunca devem conter segredos. Credenciais de servidor devem permanecer fora do bundle e do Git.

O `.gitignore` exclui `.env` e `.env.*`, com exceção de `.env.example`. Criar exemplo somente quando houver variáveis reais necessárias, usando placeholders sem valores reais. Não indexar arquivos de ambiente na base de conhecimento.
