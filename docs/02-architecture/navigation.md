---
{
  "id": "ta-pago.docs.02-architecture.navigation",
  "title": "Navegação",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "src/components/app-tabs.tsx",
    "src/components/app-tabs.web.tsx",
    "src/app/_layout.tsx"
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
  "domain": "navigation"
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

## Inventário derivado do código

O extrator estático gera entidades de rota para `/` e `/explore` a partir dos arquivos reais com exportação default. `_layout.tsx` é um componente/layout não navegável e aparece separadamente no inventário. A relação estrutural entre layout e páginas é `inferred`, pois depende da convenção do Expo Router; JSX e destinos literais de links são observações sintáticas.

As variantes nativa e web de `AppTabs` têm identidades próprias. Imports compartilhados com alternativa web recebem confiança inferida quando a seleção depende do bundler. Relações `has-web-variant` incluem evidência dos arquivos compartilhado e web; `handles-event` associa callbacks a seus componentes. Links com destino variável permanecem `unknown`; a ferramenta não inventa a rota final. Não foram criadas rotas fitness ou autenticação.
