---
{
  "id": "ta-pago.docs.02-architecture.navigation",
  "title": "Navegação",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "src/components/app-tabs.tsx",
    "src/components/app-tabs.web.tsx",
    "src/app/_layout.tsx",
    "src/components/personal/navigation.tsx",
    "server/app.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.0.0",
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

O layout raiz aplica tema, sessão e rotas protegidas. A autorização efetiva também acontece na API; esconder uma tela não concede nem remove acesso a dados.

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| `/entrar` | Sem sessão | Login e criação de conta com papel personal ou aluno. |
| `/` | Autenticado | Painel do personal ou acompanhamentos do aluno. |
| `/alunos` | Personal | Lista, busca, filtros e cadastro. |
| `/alunos/[id]` | Personal proprietário | Perfil com sete abas e histórico. |
| `/programas` | Personal | CRUD de programas próprios. |
| `/modelos` | Personal | Modelo base e versões próprias de questionários. |
| `/acompanhamento/[id]` | Aluno vinculado | Consulta, respostas em rascunho, exportação e revogação. |
| `/explore` | Autenticado | Redireciona ao painel. |

AppTabs usa navegação compartilhada com tema claro/escuro e adaptação de largura. A saída web é SPA (`single`); Express entrega index.html para links diretos e atualização de páginas. Rotas de feed e desafios permanecem planejadas.
