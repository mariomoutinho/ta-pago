---
{
  "id": "ta-pago.docs.03-features.workouts",
  "title": "Treinos personalizados",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-20",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
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
  "version": "5.0.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.01-requirements.functional-requirements",
    "ta-pago.docs.02-architecture.data-model"
  ],
  "framework_version": null,
  "domain": "workouts"
}
---

# Treinos personalizados

## Estado e auditoria

Prescrição integrada ao módulo Personal existente: Expo 57/React Native, Expo Router, Express, Prisma 7/SQLite e Zod. Sessões usam cookies HttpOnly na web e SecureStore no nativo. User.role diferencia personal/student; Student.personalId e Student.accountId vinculam o cadastro profissional à conta do aluno, inclusive nos convites e cadastros públicos existentes.

Program não era uma rotina estruturada: guarda sessões em texto e é usado também por avaliações. Foi preservado, assim como registros de treinamento e demais abas. Cards, botões, campos, diálogos, tema claro/escuro, fontes e espaçamentos são reutilizados de personal/ui e constants/theme. Não há nova biblioteca visual nem dependência de drag-and-drop. Feed, desafios, GPS e geração automática continuam fora do escopo.

## Fluxo implementado

Personal → Alunos → perfil → Treinos → Criar treino → dados do plano → Adicionar treino → Adicionar exercício → biblioteca → cadastrar ou selecionar → configurar prescrição → Confirmar prescrição → Salvar plano.

Salvar com status ativo publica para a conta vinculada do aluno. Rascunhos permanecem privados. Datas distinguem planos atuais, futuros e encerrados; arquivamento mantém planos publicados acessíveis ao aluno. É possível ter vários planos ativos em paralelo. Um plano publicado não volta a rascunho.

Aluno → Treinos, ou perfil do acompanhamento → Treinos → selecionar sessão. Leitura inclui exercícios ordenados, orientações, imagem opcional e link externo de vídeo. Não existe edição de prescrição pela conta do aluno.

## Modelo e persistência

A migration aditiva 20261020120000_workout_prescription cria WorkoutPlan, Workout, Exercise e WorkoutExercise, com IDs cuid, timestamps, índices e foreign keys. Não altera IDs nem dados existentes. A atribuição é WorkoutPlan.studentId → Student; personal responsável é Student.personalId. Não há outro cadastro nem tabela redundante de alunos/atribuições: cada plano pertence a um vínculo existente.

Exercícios pertencem ao personal e podem ser reutilizados em várias prescrições. Arquivar o exercício impede novas inclusões, mas preserva prescrições existentes. Edições na biblioteca atualizam a descrição compartilhada; não há snapshot de cada versão da biblioteca. Sessões e prescrições removidas recebem deletedAt; listas de leitura omitem esses itens. Arquivar plano mantém seus filhos. Cascades são usados para a exclusão explícita do acompanhamento pelo titular, já existente no produto; exercícios da biblioteca não são apagados com o aluno. Foreign key Restrict impede excluir um exercício referenciado.

Salvar um plano é uma transação única. revision detecta edição desatualizada (HTTP 409). A ordem é recalculada no servidor a partir dos arrays. Duplicação cria novos IDs para sessão e prescrições. A exportação existente do acompanhamento inclui planos; para o aluno, somente publicados.

## Validação e autorização

Todas as rotas são montadas após autenticação. Operações profissionais validam papel, proprietário e vínculo não encerrado; edição também valida IDs dos filhos e propriedade dos exercícios dentro da transação. O aluno consulta somente planos publicados do próprio accountId. Após revogação, o personal perde acesso e o titular mantém histórico, conforme o contrato de acompanhamento existente.

Zod valida nomes sem espaços vazios, datas reais e coerentes, URLs http/https, limites de arrays e números não negativos. Séries, carga em kg, duração/descanso em segundos, RIR/RPE e cadência são opcionais. Repetições aceitam inteiro ou faixa como 8-12; intensidade pode ser descrita em observações. Ativação exige pelo menos uma sessão e exercício em cada sessão.

## Telas e API

- /exercicios: biblioteca privada do personal, cadastro, edição, busca, filtros por grupo/categoria e arquivamento/restauração. Todos os itens são “meus exercícios”; não existe biblioteca pública.
- /treinos: planos publicados do aluno.
- /alunos/[id] e /acompanhamento/[id]: nova aba Treinos, preservando Treinamentos para registros anteriores.
- GET/POST /api/exercises; PUT /api/exercises/:id (inclui status de arquivamento).
- GET/POST /api/students/:studentId/workout-plans.
- PUT /api/workout-plans/:id: plano, sessões e prescrições em uma transação; status permite publicar/arquivar.
- GET /api/me/workout-plans: leitura autorizada do aluno, sem endpoints de escrita.

## Operação e teste manual

Antes de iniciar a nova versão da API, execute com Node da .nvmrc:

```bash
npx prisma generate
npx prisma migrate deploy
npm run personal:build
npm run personal:start
```

1. Entre como personal e abra um aluno existente, ou cadastre um pela área atual.
2. Na aba Treinos, crie plano, adicione Treino A e cadastre manualmente um exercício na biblioteca.
3. Configure séries/repetições/carga/descanso ou somente duração; confirme a prescrição.
4. Salve como rascunho, reabra e confira persistência. Reordene/duplique sessões e exercícios.
5. Salve como ativo. Use o convite existente para conectar a conta do aluno ao mesmo cadastro.
6. Entre como aluno em outra sessão e abra Treinos; confira instruções, ordem e ausência de controles de edição.
7. Confira que outra conta de aluno não recebe o plano e outro personal não acessa o vínculo.
8. Arquive um exercício e o plano; confira que o histórico publicado permanece legível.

## Testes automatizados e limites

A suíte tests/personal/workouts.test.ts cobre CRUD da biblioteca, atribuição sem duplicação, publicação, exercícios por tempo, ordem, duplicação, autorização cruzada, validações, concorrência, soft-delete, revogação e integridade após exclusão do acompanhamento. O cenário Playwright em tests/personal/browser/app.spec.ts percorre a criação mobile e leitura pela conta do aluno. Usam bancos temporários com todas as migrations, sem dados reais.

Imagem é cadastrada por URL, sem upload de mídia. Vídeos abrem no navegador. Testes nativos em dispositivos Android/iOS e publicação em hospedagem não fazem parte da execução local. O comando lint herdado necessita configuração/dependências ESLint, ausentes na base auditada.
