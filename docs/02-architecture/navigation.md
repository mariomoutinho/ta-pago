---
{
  "id": "ta-pago.docs.02-architecture.navigation",
  "title": "Navegação",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-21",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "src/components/personal/dashboard.tsx",
    "src/components/app-tabs.tsx",
    "src/components/app-tabs.web.tsx",
    "src/app/_layout.tsx",
    "src/components/personal/navigation.tsx",
    "server/app.ts",
    "src/app/alunos/link.tsx",
    "src/app/cadastro/[token].tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.2.0",
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

## Cadastro por link

`/alunos/link` exige personal; `/cadastro/[token]` é pública, com logo e formulário em etapas. A API continua autorizando cada consulta privada. Veja [fluxo de cadastro](../03-features/enrollment-links.md).


## Página inicial do personal

O painel em src/components/personal/dashboard.tsx organiza as ações por seção: saudação, resumo de cadastros pendentes/avaliações/sessões semanais, Seus alunos, Treinos, Próximos cuidados e Acompanhamento. Adicionar aluno abre o formulário existente diretamente; Link de cadastro abre /alunos/link. Os cards de treino abrem a seleção de aluno, biblioteca, programas e modelos existentes. Os contadores vêm de /students e /enrollment/requests, com estados de carregamento, erro e nova tentativa; não simulam retenção ou engajamento.

O cabeçalho fica compacto no celular e a navegação usa rolagem horizontal em uma linha. Em telas largas, os blocos do painel usam duas colunas. Tema, cores e componentes são os do Tá Pago. A home do aluno preserva seu fluxo de acompanhamento.
