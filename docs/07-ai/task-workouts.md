---
{
  "id": "ta-pago.docs.07-ai.task-workouts",
  "title": "Entrega — prescrição de treinos",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-20",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "server/workouts.ts",
    "shared/workouts.ts",
    "prisma/schema.prisma",
    "prisma/migrations/20261020120000_workout_prescription/migration.sql",
    "src/components/workouts/plans.tsx",
    "src/components/workouts/plan-form.tsx",
    "src/components/workouts/exercise-library.tsx",
    "tests/personal/workouts.test.ts",
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

# Entrega — prescrição de treinos

## Implementado

Biblioteca manual privada; busca e filtros; edição e arquivamento/restauração; planos por aluno existente; sessões com duplicação, edição, exclusão lógica e reordenação; prescrição flexível; publicação; leitura do aluno; validação e autorização no servidor; exportação integrada; formulários com loading, erros, confirmação e sucesso.

## Arquivos criados

- shared/workouts.ts
- server/workouts.ts
- prisma/migrations/20261020120000_workout_prescription/migration.sql
- src/app/exercicios.tsx
- src/app/treinos.tsx
- src/components/workouts/form.tsx
- src/components/workouts/exercise-library.tsx
- src/components/workouts/exercise-view.tsx
- src/components/workouts/prescription-form.tsx
- src/components/workouts/workout-editor.tsx
- src/components/workouts/plan-form.tsx
- src/components/workouts/plans.tsx
- tests/personal/workouts.test.ts
- docs/07-ai/task-workouts.md

## Arquivos modificados

- prisma/schema.prisma
- server/app.ts
- src/app/_layout.tsx
- src/components/personal/navigation.tsx
- src/components/personal/profile.tsx
- src/components/personal/ui.tsx
- tests/personal/browser/app.spec.ts
- README.md
- docs/03-features/workouts.md
- knowledge/code-inventory.json
- knowledge/code-manifest.json
- knowledge/manifest.json

## Banco de dados e rotas

Migration aditiva com WorkoutPlan, Workout, Exercise e WorkoutExercise. WorkoutPlan aponta para Student existente, que já identifica personal e conta do aluno. As sessões possuem prescrições relacionadas à biblioteca. Nenhum dado antigo é transformado ou apagado pela migration.

Telas /exercicios, /treinos e aba Treinos nos perfis atuais. API /api/exercises (GET/POST), /api/exercises/:id (PUT), /api/students/:studentId/workout-plans (GET/POST), /api/workout-plans/:id (PUT), /api/me/workout-plans (GET).

## Segurança

Papel, proprietário e vínculo são validados no servidor. IDs de sessões/prescrições são conferidos dentro do plano; exercícios devem pertencer ao personal. Rascunhos não são expostos ao aluno, inclusive na exportação. Alunos só leem os planos publicados dos próprios vínculos e não dispõem de endpoint de edição. Revogação bloqueia o profissional e preserva histórico ao titular. Transações e revision protegem salvamento concorrente.

## Testes

- personal:test: 49 testes aprovados, incluindo 7 cenários abrangentes de prescrição.
- personal:e2e: 3 testes aprovados no Chromium, incluindo criação mobile e leitura em conta separada; capturas mobile e desktop locais em test-results.
- typecheck e personal:typecheck: aprovados.
- personal:build: exportação web aprovada.
- docs:validate: documentos válidos; docs:test: 33 aprovados; code:test: 20 aprovados.
- code:inventory, knowledge:build, code:check e knowledge:check: geração e verificação determinísticas.
- lint: comando executado, mas a base não tem ESLint configurado; instalação automática falhou por acesso à rede. A alteração incompleta em package.json foi removida.
- RAG local/WASM: 22 testes aprovados após regeneração final, sem APIs externas.
- npm test: testes documentais e de código passaram; a etapa RAG encontrou o PostgreSQL opcional indisponível em 127.0.0.1:5433. Os manifestos foram regenerados após a formatação final.

Os testes Prisma/HTTP e Node foram executados fora do sandbox após EPERM nos subprocessos. O Chromium usou bibliotecas extraídas em /tmp, sem instalação no sistema. Não houve alteração de dependências do projeto, uso de API de IA ou CI remota confirmada.

## Como testar manualmente

Siga a preparação e os oito passos em [Treinos personalizados](../03-features/workouts.md). Caminho principal: Personal → Alunos → perfil → Treinos → criar plano → adicionar treino → cadastrar/selecionar exercício → confirmar prescrição → salvar ativo → aceitar convite na conta do aluno → Treinos → abrir sessão.

## Pendências

Configurar ESLint para disponibilizar o lint herdado; disponibilizar PostgreSQL somente para a suíte opcional de RAG; validar teclado e comportamento em dispositivos nativos reais. A migration foi validada em bancos de teste: deve ser aplicada com prisma migrate deploy no ambiente que receber a atualização. Nenhum deploy foi solicitado ou executado.
