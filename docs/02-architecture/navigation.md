---
{
  "id": "ta-pago.docs.02-architecture.navigation",
  "title": "Navegação",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-23",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "src/app/treinos-preparados.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/feedbacks.tsx",
    "src/components/workouts/plans.tsx",
    "src/components/personal/profile-home.tsx",
    "src/components/personal/profile.tsx",
    "src/components/personal/student-list-row.tsx",
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
  "version": "4.10.0",
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
| `/alunos/[id]` | Personal proprietário | Perfil com Início, Opções e acesso ao prontuário. |
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

## Lista de alunos

/alunos apresenta uma lista alfabética compacta com iniciais, nome, status e vínculo real da conta. A busca aceita nome sem acentos, e-mail e telefone com ou sem formatação; filtros Todos/Ativos/Pausados/Inativos mostram contagens do conjunto recebido da API, independentes da busca. Cada linha abre o acompanhamento existente. Adicionar aluno reutiliza o formulário, e Link de Cadastro e solicitações recebidas continuam acessíveis. Grupos, modalidade online/presencial e lixeira de excluídos não são simulados: não existem no cadastro atual.

## Perfil do aluno

O perfil abre em Início, com identificação compacta, atalhos para treinos, progresso e avaliações, frequência da semana (segunda a domingo), engajamento e última anotação. A frequência utiliza os registros de treinamento; dias sem registro ficam vazios. A média considera registros realizados nos últimos 28 dias, divididos por quatro semanas, sem atribuir risco automaticamente.

Opções reúne edição do cadastro e todas as seções anteriores do prontuário. Dados do aluno e vínculo mantém o resumo detalhado, programa, exportação e controles de privacidade. Adicionar anotação usa o formulário existente e persiste no histórico; a visão do aluno continua somente leitura para esses registros. As cores acompanham o tema do Tá Pago.

## Rotinas de treino do aluno

A área Treinos mantém o cabeçalho compacto do aluno e volta diretamente ao início do perfil. Rotinas de treino e Arquivadas dividem a listagem; filtros Todas, Atuais, Futuras, Encerradas e Rascunhos usam status e vigência reais. Cada cartão mostra nome, datas, objetivo, dificuldade e quantidade de treinos. Abrir a rotina revela a prescrição existente; o menu de opções permite ver, editar ou arquivar. A criação reutiliza o formulário de planos. A conta do aluno consulta apenas os planos publicados autorizados pela API, sem ações de edição. Aeróbico separado e lixeira de rotinas não são funcionalidades implementadas.

O detalhe da rotina separa resumo e cartões de treinos. O resumo apresenta status e visibilidade real conforme publicação; editar e arquivar ficam no menu. Reordenar treinos abre o editor existente, e Adicionar treino abre esse editor com um novo treino ainda não salvo. Cada cartão mostra nome, subtítulo e quantidade de exercícios, com expansão da prescrição. Contagens de execuções e evolução por treino não são simuladas. O botão Feedbacks mostra comentários persistidos por treino, com data e hora; somente o aluno vinculado pode enviar em rotinas ativas publicadas, usando Terminei: enviar feedback.

Ao tocar no treino ou em Ver exercícios, uma janela lista os exercícios prescritos em linhas compactas. Cada linha expande a prescrição e o vídeo; Expandir todos abre a lista completa. Para o personal, Adicionar exercício abre a biblioteca em uma janela e Editar e reordenar abre o treino correspondente no editor. Selecionar um exercício mantém o fluxo de configurar, confirmar prescrição e salvar plano; cancelar não altera os dados persistidos.

O exercício expandido mostra vídeo e tabela de séries. Para o personal, essa tabela é editável e oferece adicionar, replicar e excluir linhas, salvar prescrição e salvar/aplicar presets privados. Para o aluno, exibe apenas os valores persistidos.

## Treinos preparados

A rota `/treinos-preparados` e seu item de navegação são exclusivos da conta personal. O perfil do aluno oferece seleção de um modelo durante a criação/edição da rotina; a seleção apenas preenche uma cópia local até salvar o plano.
