---
{
  "id": "ta-pago.docs.02-architecture.system-overview",
  "title": "Visão da arquitetura",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "app.json",
    "src/app/_layout.tsx"
  ]
}
---

# Visão da arquitetura

## Arquitetura observada

O repositório contém um cliente Expo com React Native, React Native Web e TypeScript. A entrada em `package.json` é `expo-router/entry`. O layout em `src/app/_layout.tsx` monta o tema, a animação de abertura e as abas.

As rotas `/` e `/explore` mostram o template do Expo. Há componentes compartilhados e variantes `.web.tsx`. `app.json` configura saída web estática, esquema `tapago`, ícones e plugins do Router e splash.

## Limites atuais

Não foram encontrados servidor, banco de dados, autenticação, API de negócio, armazenamento de fotos, coleta GPS ou cliente RAG. Dependências de interface instaladas não comprovam funcionalidades do produto.

## Evolução proposta

Separar interface, regras de domínio e acesso a dados quando surgirem fluxos reais. Escolher serviços externos por ADR, com critérios de autorização, custo, portabilidade e operação. Nenhuma dessas camadas futuras é apresentada como implementada.

Veja [estrutura](app-structure.md), [navegação](navigation.md) e [integrações](integrations.md).
