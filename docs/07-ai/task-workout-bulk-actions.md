---
{
  "id": "ta-pago.docs.07-ai.task-workout-bulk-actions",
  "title": "Entrega — arraste e ações em lote nos exercícios",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-24",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "shared/workout-groups.ts",
    "shared/workouts.ts",
    "src/components/workouts/workout-exercise-list.tsx",
    "src/components/workouts/exercise-checkbox.tsx",
    "src/components/workouts/exercise-checkbox.web.tsx",
    "src/components/workouts/sortable-exercises.web.tsx",
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/plans.tsx",
    "server/workouts.ts",
    "server/workout-templates.ts",
    "prisma/migrations/20261024120000_workout_groups/migration.sql",
    "tests/personal/workout-groups.test.ts",
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

# Entrega — arraste e ações em lote nos exercícios

## Objetivo e estado inicial

Implementar arraste fluido e seleção por checkbox com combinação e exclusão em lote na montagem de treinos, preservando tema, prescrições e autorização. Branch main, origin no GitHub e Node 24.19.0. O estado inicial tinha somente um arquivo não rastreado de metadados de imagem, que foi preservado fora da tarefa.

O WorkoutEditor já tinha handles e seleção sem ações em lote. A janela WorkoutWindow usava outra lista, sem esses controles. A captura enviada também mostrava um editor anterior ao código corrente; não foi inferido deploy remoto. O banco local estava sem a migração do editor de 23/10.

## Decisões e implementação

A lista WorkoutExerciseList concentra seleção individual/global, expansão, confirmação de exclusão e blocos combinados. WorkoutEditor a utiliza com o salvamento explícito dos formulários; WorkoutWindow salva as operações imediatamente, usando os endpoints já existentes. Combinar reúne seleções não adjacentes na primeira posição selecionada sem reescrever as prescrições. Blocos podem ser separados ou excluídos por inteiro; remover um membro de um par dissolve o restante unitário.

shared/workout-groups.ts reúne as operações puras e validação de contiguidade. A migração aditiva cria groupId opcional nas associações, enquanto modelos mantêm grupos em seu JSON existente. Os schemas e endpoints de ordem rejeitam blocos incompletos/intercalados. O aluno lê a combinação, sem poderes de edição. Não foi criada outra biblioteca ou endpoint de exclusão global.

SortableExercises web usa DragOverlay em portal, evitando recorte do item no modal; o movimento é vertical e tem realce, cursor e transições. A alternativa de teclado Alt + setas e os controles acessíveis continuam disponíveis. Os checkboxes web são inputs nativos; a variante React Native mantém os estados de acessibilidade. @types/react-dom ~19.2.0 foi adicionado somente como dependência de desenvolvimento para tipar o portal, sem nova dependência de execução.

## Validação e operação local

Os 27 testes de treinos, modelos, operações de grupos e migrações passaram e cobrem preservação de IDs/dados, blocos, remoção, validação, autorização cruzada e isolamento entre alunos. A suíte de navegador com 12 cenários passou, incluindo mouse, toque prolongado, teclado, ações em lote, falha ao combinar com rollback, recarga e regressão da prescrição. Foram verificadas larguras de 360, 390, 768 e 1280 px, além de capturas de tela dos blocos.

O banco local recebeu as migrações pendentes 20261023180000_workout_editor e 20261024120000_workout_groups após backup SQLite consistente em .rag/groups-backup, fora do Git e do catálogo. Contagens de todas as tabelas do módulo foram preservadas e integrity_check retornou ok. Nenhuma migração de produção foi executada. A aplicação local foi iniciada em http://127.0.0.1:3003, com respostas HTTP 200 na raiz e em /api/health.

As verificações de TypeScript de frontend e backend passaram. docs:test teve 31 sucessos e 2 falhas por symlinks não permitidos neste Windows; code:test teve 17 sucessos e 3 falhas nas fixtures de symlink/proveniência Git. Essas falhas de ambiente não foram ocultadas nem corrigidas ampliando o escopo. O build de produção, docs:validate, code:inventory, knowledge:build, knowledge:check e code:check passaram. Dispositivos Android/iOS físicos e CI remota não foram validados nesta execução.
