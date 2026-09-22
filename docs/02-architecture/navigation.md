---
{
  "id": "ta-pago.docs.02-architecture.navigation",
  "title": "Navegação",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "src/components/app-tabs.tsx",
    "src/components/app-tabs.web.tsx",
    "src/app/_layout.tsx"
  ]
}
---

# Navegação

## Rotas existentes

| Rota | Arquivo | Conteúdo |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Boas-vindas e instruções do Expo. |
| `/explore` | `src/app/explore.tsx` | Exemplos e links de documentação. |

`src/app/_layout.tsx` aplica tema e monta `AppTabs`. A variante nativa usa `expo-router/unstable-native-tabs`; a variante web usa `expo-router/ui`. Não há rotas protegidas ou telas de aluno, professor, feed ou treino.

## Direção futura

Definir jornadas e autorização antes de adicionar grupos de rotas. Um grupo de rotas não substitui controle de acesso no serviço de dados. Validar links diretos e comportamento do botão voltar em cada plataforma.
