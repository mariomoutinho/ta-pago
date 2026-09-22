---
{
  "id": "ta-pago.docs.04-development.local-setup",
  "title": "Ambiente local",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "scripts/reset-project.js"
  ]
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

Os scripts documentais usam apenas módulos nativos do Node. O comando `npm run lint` herdado chama `expo lint`, mas ESLint e sua configuração ainda não estão presentes; o assistente pode propor instalá-los. Não tratá-lo como verificação já configurada.

Não executar `reset-project` para tarefas documentais: ele move ou remove `src` e `scripts`.
