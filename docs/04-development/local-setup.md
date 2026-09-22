---
{
  "id": "ta-pago.docs.04-development.local-setup",
  "title": "Ambiente local",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "scripts/reset-project.js"
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
  "domain": "development"
}
---

# Ambiente local

## Pré-requisitos

Usar Node.js 22.13 ou superior compatível com Expo 57 e npm. A CI documental usa Node 24. Consultar a [referência versionada](https://docs.expo.dev/versions/v57.0.0/) antes de alterações no app.

```bash
npm ci
npm start
```

Para web, executar `npm run web`. `npm run android` requer ambiente Android ou dispositivo configurado. `npm run ios` requer ambiente Apple adequado para simulador. Não é necessário configurar backend ou `.env` para o template atual.

## Verificações

```bash
npm run typecheck
npm run docs:validate
npm run docs:test
npm run knowledge:check
```

A validação documental usa módulos nativos do Node; o comando de construção consolidada também usa o TypeScript instalado para analisar o código. O comando `npm run lint` herdado chama `expo lint`, mas ESLint e sua configuração ainda não estão presentes; o assistente pode propor instalá-los. Não tratá-lo como verificação já configurada.

Não executar `reset-project` para tarefas documentais: ele move ou remove `src` e `scripts`.

## Inventário de código

Após `npm ci`, executar `npm run code:inventory`, `npm run code:check` e `npm run code:test`. Esses scripts usam o TypeScript do lockfile e não instalam dependências adicionais. Para validar a origem Git, clones da CI usam histórico completo; `commit_sha` documenta a revisão-base fixada em `knowledge/config.json`.
