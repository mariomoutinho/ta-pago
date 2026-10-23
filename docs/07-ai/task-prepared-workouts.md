---
{
  "id": "ta-pago.docs.07-ai.task-prepared-workouts",
  "title": "Entrega — treinos preparados",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-23",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "server/workout-templates.ts",
    "shared/workouts.ts",
    "prisma/schema.prisma",
    "prisma/migrations/20261023160000_workout_templates/migration.sql",
    "src/components/workouts/prepared-workouts.tsx",
    "src/components/workouts/plan-form.tsx",
    "tests/personal/workout-templates.test.ts",
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

# Entrega — treinos preparados

## Objetivo e escopo

Permitir preparar treinos privados sem aluno e copiar para rotinas de alunos existentes. Critérios: persistência, exercícios da própria biblioteca, edição e exclusão do modelo, cópias independentes, publicação somente pelo fluxo de plano e isolamento de contas.

## Evidências iniciais

Branch main, remoto origin no GitHub, sem alterações locais no início. WorkoutPlan exigia Student e não havia biblioteca de modelos. Durante a execução surgiu um registro das rotas em server/app.ts com reorganização de imports; a integração usa um único registro nesse arquivo.

## Decisões

Tabela aditiva WorkoutTemplate, sem aluno, com prescrições validadas em JSON e revisão para evitar sobrescrita concorrente. Reutilização do WorkoutEditor e seleção embutida no PlanForm para não empilhar modais. Copiar preserva valores e ordem, gera novos IDs ao salvar e não inclui feedbacks. Exercícios continuam referências à biblioteca do personal.

## Alterações e validação

Os testes de API cobrem criação sem aluno, isolamento por papel/proprietário, exercícios inválidos, revisão, cópias para dois alunos e preservação após exclusão do modelo. O teste de navegador cobre criação, recarga, seleção no perfil, personalização e persistência em rascunho. Resultados de execução são informados na entrega da tarefa.

## Conhecimento e entrega

Documentação de treinos, navegação e README atualizada; inventários gerados a partir das fontes reais. Aplicar migration aditiva, recompilar e reiniciar API para disponibilizar localmente. Commit e push normais ao finalizar as validações.
