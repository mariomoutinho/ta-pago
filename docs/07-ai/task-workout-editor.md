---
{
  "id": "ta-pago.docs.07-ai.task-workout-editor",
  "title": "Entrega — editor compacto de treinos",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-23",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/sortable-exercises.web.tsx",
    "src/components/workouts/sortable-exercises.tsx",
    "src/components/workouts/exercise-expansion.web.tsx",
    "src/components/workouts/series-editor.tsx",
    "server/workouts.ts",
    "server/workout-templates.ts",
    "server/workout-order.ts",
    "shared/workouts.ts",
    "prisma/migrations/20261023180000_workout_editor/migration.sql",
    "tests/personal/workouts.test.ts",
    "tests/personal/workout-templates.test.ts",
    "tests/personal/workout-editor-migration.test.ts",
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

# Entrega — editor compacto de treinos

## Diagnóstico e escopo

Branch main, origin no GitHub e Node 24.19.0. O diretório já continha a implementação local de treinos preparados, ainda sem commit, além de documentação e inventários correspondentes. Esses arquivos foram preservados e integrados como base necessária do editor compartilhado; um arquivo de metadados de imagem alheio ao trabalho permanece fora da entrega.

WorkoutEditor atendia planos e modelos com controles de subir/descer e sem compactação. Express/Prisma já mantinham orderIndex, revisão e transações. Presets guardavam somente séries; alternativas não existiam. A biblioteca ExerciseLibrary e os componentes Card, Button, Dialog, Confirm, PrescriptionForm, PrescriptionView e SeriesEditor foram reutilizados.

## Implementação e arquivos

WorkoutEditor concentra cabeçalhos, seleção, menu com cinco ações, confirmações, estados de expansão e rollback de ordem. SortableExercises tem variantes web e nativa. ExerciseExpansion mantém campos montados e anima a expansão web respeitando movimento reduzido. SeriesEditor diferencia confirmação no rascunho de gravação imediata na janela existente. PlanForm e PreparedWorkoutForm atualizam a revisão ao salvar a ordem isoladamente.

server/workout-order.ts valida permutações; server/workouts.ts e server/workout-templates.ts gravam ordem com autorização e transação. shared/workouts.ts define alternativas, IDs dos itens de modelos e configuração completa de presets. A migração aditiva acrescenta a relação de alternativa, configuração de preset e IDs aos modelos existentes. Não aplica mudanças ao banco de produção.

Dependências adicionadas: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0 e @dnd-kit/utilities 3.2.2 para web. React Native reutiliza PanResponder. Não havia drag and drop no projeto. scripts/docs/lib.mjs normaliza separadores produzidos por node:path antes da validação de links, mantendo as restrições de segurança.

## Validação e limites

19 testes dos módulos de treinos e migração passaram em bancos temporários, incluindo modelos preenchidos antes da migração. A suíte de navegador com 10 cenários passou, cobrindo o fluxo anterior de prescrição e leitura do aluno. Os cenários novos cobrem mouse, toque prolongado em Chromium com emulação móvel, teclado, recarga, rollback com erro HTTP, menu, confirmação de troca/exclusão, presets, alternativas, expansão e campos preservados. Larguras: 360, 390, 768 e 1280 px. O build de produção e as verificações TypeScript de frontend e backend passaram.

As suítes documentais e de extração foram executadas: docs:test teve 31 sucessos e 2 falhas por criação de symlink não permitida; code:test teve 17 sucessos e 3 falhas ligadas a symlink e à fixture de proveniência Git no Windows. A suíte personal:test completa encontrou chamadas Unix do Prisma nos testes de outros módulos. Nos testes de treinos e navegador, a chamada foi tornada portátil usando process.execPath. Lint foi tentado e falhou por ausência de configuração ESLint e escrita de cache Expo fora do workspace. Nenhuma aprovação de CI remota foi presumida.

Dispositivos Android/iOS físicos não foram testados. Rascunhos novos e listas com inclusões/exclusões pendentes salvam a ordem junto com o formulário; listas persistidas com as mesmas associações salvam ao soltar. Mudanças de prescrição, troca, alternativa e exclusão usam o salvamento existente do formulário. Não houve deploy nem migração de banco real.
