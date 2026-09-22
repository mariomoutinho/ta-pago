---
{
  "id": "ta-pago.docs.02-architecture.app-structure",
  "title": "Estrutura do aplicativo",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
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
  "domain": "architecture"
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

## Ferramentas de conhecimento existentes

`scripts/docs/` valida metadados e gera chunks documentais em `knowledge/manifest.json`. `scripts/code/` usa TypeScript já instalado para analisar somente arquivos `.ts` e `.tsx` permitidos sob `src/`, gerando `code-inventory.json` e `code-manifest.json`. `scripts/knowledge/common.mjs` compartilha contratos básicos, proveniência, hashes, chunks e comparação incremental.

O manifesto principal consolida documentos e código em coleções distintas. O inventário dedicado oferece contagens e grupos de IDs por tipo; o manifesto de código v1 usa `entities`. A consolidação em `scripts/knowledge/catalog.mjs` extrai de `src/` mesmo se os arquivos gerados estiverem ausentes ou vazios. Componentes, hooks, rotas, funções, constantes, comportamentos e relações recebem IDs e evidências locais. A estrutura de embeddings/vetores permanece vazia e índices são apenas declarados. O aplicativo não importa nem consulta esses artefatos; não há integração operacional de RAG.
