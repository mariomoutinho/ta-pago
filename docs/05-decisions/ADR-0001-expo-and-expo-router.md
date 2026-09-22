---
{
  "id": "ta-pago.docs.05-decisions.ADR-0001-expo-and-expo-router",
  "title": "ADR-0001 — Expo e Expo Router",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "05-decisions"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "src/components/app-tabs.tsx"
  ]
}
---

# ADR-0001 — Expo e Expo Router

## Estado

Aceita como registro da base técnica já encontrada, não como reconstrução de uma comparação histórica de alternativas.

## Contexto

O projeto já usa Expo 57, React Native, TypeScript e Expo Router. A entrada, rotas e variantes web estão presentes no código.

## Decisão

Manter essa base e a navegação por arquivos enquanto a documentação e os requisitos do produto são estruturados. Consultar a [referência Expo 57](https://docs.expo.dev/versions/v57.0.0/) antes de alterar código.

## Consequências

Preservar compatibilidade entre versões e validar diferenças web/nativo. As abas nativas existentes usam uma API com caminho `unstable-native-tabs`, que deve ser reavaliada em upgrades. Nenhuma decisão de backend, banco ou autenticação decorre desta ADR.

## Alternativas e revisão

Não há evidência de avaliação anterior de outros frameworks. Uma mudança de framework ou navegação exigirá nova ADR com problema concreto, custos e plano de migração.
