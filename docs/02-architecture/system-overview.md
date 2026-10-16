---
{
  "id": "ta-pago.docs.02-architecture.system-overview",
  "title": "Visão da arquitetura",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "app.json",
    "src/app/_layout.tsx",
    "server/app.ts",
    "server/db.ts",
    "shared/validation.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.0.0",
  "authority": "architecture",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.02-architecture.app-structure",
    "ta-pago.docs.02-architecture.integrations",
    "ta-pago.docs.02-architecture.navigation"
  ],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "architecture"
}
---

# Visão da arquitetura

O cliente Expo 57 compartilha telas React Native entre web e plataformas nativas. `src/app/_layout.tsx` monta tema, sessão e proteção de rotas. O módulo Personal reside em `src/features/personal` e `src/components/personal`.

Express em `server/app.ts` implementa a API de negócio. Prisma com adaptador SQLite persiste contas, vínculos, programas, modelos versionados, avaliações, registros e histórico. Regras Zod e questionário ficam em `shared`. O servidor também entrega a exportação web SPA de `dist`.

Na web, a sessão usa cookie HttpOnly SameSite Strict; no nativo, token armazenado por SecureStore. O banco guarda somente o hash do token e expiração de 12 horas. A API verifica papel, propriedade e estado do vínculo a cada operação. Convites são únicos, duram 48 horas e têm somente hash persistido.

A API Personal usa PERSONAL_DATABASE_URL, independente do DATABASE_URL da ferramenta RAG. Não existe integração entre dados de alunos e catálogo de conhecimento. Rede social, fotos, GPS e publicação em produção permanecem fora desta implementação.

Veja [módulo Personal](../03-features/personal-integration.md), [navegação](navigation.md) e [ambiente local](../04-development/local-setup.md).
