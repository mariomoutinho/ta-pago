---
{
  "id": "ta-pago.docs.04-development.debugging",
  "title": "Diagnóstico",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": [
    "server/app.ts",
    "server/index.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.0.0",
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
  "domain": "development"
}
---

# Diagnóstico

## Aplicativo

Reproduzir em plataforma identificada e registrar versões de Node, Expo e sistema. Inspecionar o terminal do Metro e o console da plataforma. Para problemas de cache, tentar `npx expo start --clear` depois de registrar o erro. Distinguir problema de resolução de módulos de comportamento de uma variante web ou nativa.

## Documentação

O validador informa arquivo e regra inválida. Corrigir o documento de origem; não editar hashes manualmente. Se `knowledge:check` acusar manifesto desatualizado, executar `npm run knowledge:build`, revisar o diff e validar novamente.

## Limites

Não compartilhar tokens, `.env`, dados de alunos ou caminhos privados em logs. Não apagar diretórios ou reinicializar o projeto como primeira tentativa. A API registra somente a classe do erro interno. Para falha de acesso local, confira Node 24, personal:setup, personal:build e personal:start; Expo isolado não inicia a API. Não há monitoramento de produção configurado.
