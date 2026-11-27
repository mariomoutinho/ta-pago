---
{
  "id": "ta-pago.docs.07-ai.task-library-auto-catalog",
  "title": "Biblioteca com catálogo automático e retorno de rotinas",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-27",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/app/alunos/[id]/treinos.tsx",
    "src/components/workouts/plans.tsx",
    "src/components/workouts/exercise-library.tsx",
    "server/workouts.ts",
    "backend-php/src/App.php",
    "backend-php/src/Workouts.php",
    "tests/personal/browser/app.spec.ts",
    "tests/personal/workout-templates.test.ts"
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
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Biblioteca com catálogo automático e retorno de rotinas

Todas as rotinas foi movido para junto de Treinos na navegação profissional do aluno. Os dois permanecem juntos em telas estreitas. O retorno remove rotina e treino da URL.

GET /exercises preenche automaticamente o catálogo privado de 240 exercícios, usando a mesma rotina transacional do endpoint anterior. Nomes existentes, IDs determinísticos, dados personalizados e arquivamentos são preservados. O PHP serializa o preenchimento por professor com bloqueio da linha da conta; o Express usa transação e upsert. O botão manual foi removido. Sem nova migração de banco.

Validação: 13 testes de API aprovados; cenários de navegador verificam biblioteca automática e navegação em desktop/mobile. Typecheck e build web aprovados. Sintaxe PHP: 30 arquivos válidos. Contrato PHP passou com PHP 8.3; a suíte MySQL não iniciou porque o banco sintético em 127.0.0.1:33316 recusou conexão. O PHP padrão do sistema é antigo e não possui array_is_list.

Validação documental e catálogos determinísticos verificados. docs:test teve 31 sucessos e duas falhas de links simbólicos por EPERM; code:test teve 17 sucessos e três falhas preexistentes (duas de links simbólicos e uma de proveniência Git). Extratores preservados.

Prévia local atualizada na porta 3003. Nenhuma publicação no site ou alteração de dados de produção foi executada. Gradle e arquivos pessoais preexistentes permanecem fora desta tarefa.
