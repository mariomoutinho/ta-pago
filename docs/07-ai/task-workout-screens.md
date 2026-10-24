---
{
  "id": "ta-pago.docs.07-ai.task-workout-screens",
  "title": "Entrega — fluxo de treinos em telas",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-24",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/app/alunos/[id]/treinos.tsx",
    "src/app/_layout.tsx",
    "src/components/personal/profile.tsx",
    "src/components/workouts/workout-screen.tsx",
    "src/components/workouts/plans.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/plan-form.tsx",
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/workout-exercise-list.tsx",
    "src/components/workouts/series-editor.tsx",
    "src/components/workouts/prepared-workouts.tsx",
    "src/components/workouts/feedbacks.tsx",
    "src/components/workouts/form.tsx",
    "tests/personal/browser/app.spec.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.03-features.workouts"
  ],
  "framework_version": null,
  "domain": "workouts"
}
---

# Entrega — fluxo de treinos em telas

## Objetivo e estado inicial

Substituir janelas flutuantes sobrepostas por etapas de tela no fluxo de treinos, preservando seleção, arraste, grupos e prescrição. Base c03c4dc em main. O arquivo de metadados de imagem não rastreado foi preservado. A instância real localhost:3003 utiliza a release WSL identificada na entrega anterior, com banco externo à release.

## Implementação

A nova rota /alunos/[id]/treinos é exclusiva de Personal, identificando rotina e treino na URL. Perfil aponta a essa rota. WorkoutScreen substitui as janelas longas; WorkoutPlans mostra somente a etapa ativa, e PlanDetails apresenta WorkoutWindow no conteúdo da página. Os formulários, a biblioteca, a prescrição, os presets e a escolha de grupo deixam de empilhar modais. Estados de formulário ficam montados/ocultos durante etapas filhas. SaveForm oculta os comandos gerais durante operações incompletas. Feedbacks também são apresentados no conteúdo. Menus rápidos e confirmações destrutivas permanecem pontuais. Não há alteração de schema ou migração nova.

## Validação e operação

Passaram as verificações de tipos do aplicativo e servidor, o build web, 87 testes de API/domínio/produção, 33 testes documentais, 20 testes de extração e os checks de documentação/catálogos. A suíte Playwright tem 13 cenários, incluindo URL do treino, voltar/avançar pelo navegador, recarga, ausência de aria-modal na tela/biblioteca, membros de grupos, mouse/toque, seleção e rollback. O lint passou sem erros, com os 18 avisos herdados já documentados.

No localhost:3003, Chromium percorreu o perfil fictício, abriu o treino como página, selecionou dois itens, combinou, reordenou, recarregou, verificou IDs/cargas/agrupamento na API, abriu a biblioteca sem modal e cancelou a edição. Capturas abertas para inspeção: test-results/workout-screens-live-desktop.png, workout-screens-live-mobile.png e workout-screens-live-library.png. Nenhum erro JavaScript foi registrado. A fixture foi removida e as contagens originais e integrity_check foram conferidos. A validação usa bancos temporários e contas fictícias, além de uma verificação da instância real com limpeza da fixture; não altera treinos reais do usuário. A atualização local reutiliza o banco e o ambiente da release ativa, preservando o checkout WSL original. Não há publicação em hospedagem nem evidência de CI remota nesta tarefa.


## Entrega local

A revisão automática rejeitou o script conjunto por conter uma opção de reinício de servidor. O preparo foi separado em um script sem acesso ao processo/banco real. A entrega utilizou somente a cópia dos assets web e substituição atômica do index.html, com backup do HTML e retenção dos assets antigos. O servidor permaneceu com o mesmo PID e a mesma base, sem reinício ou migração. O estado local está em .rag/screens-release-state.json, fora do Git. O header de release da API continua identificando o backend anterior, enquanto o hash do bundle servido corresponde à interface nova. O checkout WSL original foi preservado.

Para reproduzir, use Node 24.19.0 e execute npm ci, npx prisma generate, npm run personal:build e npm run personal:start, com o ambiente e PERSONAL_DATABASE_URL do banco desejado. A instância local já está atualizada; basta recarregar o navegador e acessar Treinos no perfil. Não refazer o build a partir do checkout WSL antigo, pois suas alterações locais foram preservadas; a fonte nova está no repositório E:/ta-pago e na cópia isolada validada indicada pelo estado local.
