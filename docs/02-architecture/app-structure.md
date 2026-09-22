---
{
  "id": "ta-pago.docs.02-architecture.app-structure",
  "title": "Estrutura do aplicativo",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "tsconfig.json",
    "src/constants/theme.ts",
    "src/hooks/use-theme.ts",
    "scripts/reset-project.js"
  ]
}
---

# Estrutura do aplicativo

| Caminho | Responsabilidade existente |
| --- | --- |
| `src/app` | Layout e rotas Home e Explore do template. |
| `src/components` | Texto e view tematizados, abas, animação, links, dicas e badge. |
| `src/components/ui` | Componente expansível de demonstração. |
| `src/constants/theme.ts` | Cores, fontes, espaçamentos e largura de conteúdo. |
| `src/hooks` | Tema e esquema de cores, com adaptação de hidratação web. |
| `src/global.css` | Fontes usadas na web. |
| `assets` | Imagens e ícones do template. |
| `logotapago.png` | Logo disponível no repositório; ainda não conectado às telas. |
| `scripts/reset-project.js` | Reinicialização do template, que move ou remove `src` e `scripts`. |
| `scripts/docs` | Validação documental e catálogo local de conhecimento. |
| `docs` | Contexto, requisitos, arquitetura, funcionalidades, desenvolvimento, decisões, operação e IA. |
| `knowledge` | Contrato de metadados, manifesto e casos de avaliação futuros. |

O alias `@/*` aponta para `src/*` e `@/assets/*` para `assets/*`. Rotas devem continuar em `src/app`; não criar telas de negócio nesta entrega documental.
