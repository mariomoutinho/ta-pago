---
{
  "id": "ta-pago.docs.07-ai.task-student-workout-execution",
  "title": "Execução de treino do aluno com séries e descanso",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": ["07-ai"],
  "indexable": false,
  "sources": ["shared/workout-execution.ts", "shared/rest-timer.ts", "shared/workouts.ts", "src/components/workouts/workout-window.tsx", "src/components/workouts/workout-exercise-list.tsx", "src/components/workouts/student-progress.tsx", "src/components/workouts/student-prescription.tsx", "src/components/workouts/set-counter.tsx", "src/components/workouts/rest-timer.tsx", "src/components/workouts/completion-dialog.tsx", "src/components/workouts/feedbacks.tsx", "src/features/personal/workout-session-storage.ts", "src/features/personal/workout-session-storage.native.ts", "src/features/personal/rest-sound.ts", "scripts/generate-rest-sound.mjs", "prisma/schema.prisma", "server/workouts.ts", "server/news.ts", "backend-php/src/Workouts.php", "backend-php/src/News.php", "tests/personal/browser/app.spec.ts", "tests/personal/workout-execution.test.ts", "tests/personal/feedback-completion-migration.test.ts"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.1.0",
  "authority": "code",
  "audience": ["developer", "ai_agent", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.03-features.personal-integration", "ta-pago.docs.07-ai.task-student-workouts-list"],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Execução de treino do aluno com séries e descanso

## Objetivo e estado inicial

Evoluir a execução existente, mantendo Focus, logo, cartões compactos, expansão e temas. O pedido exige contador de séries restantes, descanso integrado, recuperação após recarga, desfazer, progresso geral, conclusão automática, calendário e feedback ao professor. O usuário proíbe merge, push e deploy sem autorização.

Origem: branch feat/student-workouts-list, commit ec437e9. Criada a branch local feat/student-workout-execution sobre os commits locais anteriores. Alteração preexistente em native-android/gradle/wrapper/gradle-wrapper.properties e arquivos pessoais não foram incluídos. Git remoto: origin do repositório mariomoutinho/ta-pago. Node 24.19.0, conforme .nvmrc. Documentação versionada do Expo 57 consultada antes de editar e ao integrar áudio.

## Diagnóstico e estruturas reutilizadas

| Área | Evidência e decisão |
| --- | --- |
| Entrada e execução | /treinos → WorkoutPlans → PlanDetails → WorkoutWindow; preservados os parâmetros rotina/treino. |
| Minimizado/expandido | WorkoutExerciseList e ExerciseExpansion, com exerciseBlocks para combinados; preservados agrupamento e prescrição individual. |
| Prescrição | WorkoutExercise.series e campos legados; prescribedSets e initialSeries resolvem quantidades e intervalos. |
| Progresso | studentProgress contém hash da prescrição, data brasileira, completedSets e versão; PUT existente evita concorrência e não altera a prescrição. |
| Cargas | StudentPrescription mantém a gravação separada de studentLoads; não foi criado outro editor. |
| Conclusão | useStudentProgress já detectava todos concluídos e gravava WorkoutCompletion, único por treino/dia. |
| Calendário | GET /me/workout-calendar agrega conclusões por data; nenhum endpoint novo. |
| Professor e comunicação | WorkoutPlan → Student → personalId; WorkoutFeedback e novidades com leitura por profissional. |
| Persistência | Backend já guardava progresso diário; faltava recuperar o prazo do descanso. Não havia fila offline. |

## Implementação e arquivos

Criados:

- shared/workout-execution.ts: transições puras de registrar/desfazer série, totais e contrato do prazo de descanso.
- src/components/workouts/set-counter.tsx: SetCounter acessível, área de toque 48 px e check final.
- src/features/personal/workout-session-storage.ts e .native.ts: prazo local por conta, com localStorage e SecureStore.
- scripts/generate-rest-sound.mjs e assets/audio/rest-alert.wav: três tons originais sintetizados, sem arquivo de terceiros.
- tests/personal/workout-execution.test.ts e feedback-completion-migration.test.ts: séries variáveis, intervalos, prazo absoluto, correção, progresso e migração preservando dados.
- prisma/migrations/20261126190000_feedback_completion/migration.sql e backend-php/migrations/20261126_feedback_completion.sql: vínculo aditivo e anulável do feedback com a conclusão.

Adaptados:

- student-progress.tsx: contador confirma a próxima série com lock, bloqueia durante descanso, evita toques consecutivos, soma progresso real, desfaz uma série e valida o descanso restaurado.
- rest-timer.tsx: timestamps absolutos, recuperação por conta/data, retomada por AppState, som/vibração quando suportados, anúncio visual e painel inline MM:SS com barra.
- workout-window.tsx e workout-exercise-list.tsx: integrações, vermelho/check somente no estado concluído, recolhimento automático após descanso e ação discreta de correção nos detalhes.
- student-prescription.tsx: mantém cargas e prescrição; substitui o botão antigo de intervalo por leitura do descanso prescrito, evitando dois fluxos concorrentes de registro.
- completion-dialog.tsx: TÁ PAGO!, estatísticas reais, animação breve com movimento reduzido, feedback opcional, erro preservando texto e nova tentativa com o mesmo requestId; fotos e grupos preservados.
- personal/ui.tsx: Dialog aceita animationType opcional para permitir a celebração sem animação de modal imposta.
- feedbacks.tsx: exibe data/contexto da sessão; o profissional abre o leitor no próprio treino.
- shared/workouts.ts, prisma/schema.prisma, Express/PHP e contratos gerados: completionId opcional e validado contra o treino autorizado; registros antigos continuam válidos.
- server/news.ts e backend-php/src/News.php: novidade abre diretamente a rotina/treino, preservando o estado de leitura existente.
- src/features/personal/rest-sound.ts, package.json/lock e app.json: expo-audio ~57.0.5 para o adaptador nativo. Sem microfone nem reprodução em segundo plano. O app.config.ts já preserva os plugins de app.json.
- testes existentes de navegador e rest-timer: seletores adaptados ao contador e ao MM:SS, mantendo verificações de cargas, cópia de modelos, fotos e grupos.
- docs/03-features/personal-integration.md e manifestos: comportamento observado e limitações atualizados.

## Persistência, autorização e idempotência

A série só avança quando a API confirma o PUT. A versão impede contabilização duplicada da mesma atualização, inclusive após resposta perdida: a recuperação explícita recarrega o servidor antes de continuar. Durante o descanso o número principal mantém o valor anterior, embora completedSets e a barra geral já contem a série confirmada. O prazo não registra outra série ao terminar. Zero segundos atualiza imediatamente; a última série nunca abre descanso.

O armazenamento local contém somente IDs internos, revisão/versão, data e timestamps do descanso. O progresso vem do backend autorizado. A chave usa a conta e há apenas um descanso ativo por sessão do aplicativo, inclusive ao alternar entre treinos. Uma prescrição alterada ou uma execução com versão diferente invalida o prazo. Na data seguinte, a API reinicia o progresso diário, conforme o modelo existente. Os combinados mantêm exercícios e intervalos individuais prescritos; não foi inventada regra global de descanso por grupo.

A conclusão automática independe do envio de feedback. WorkoutCompletion mantém sua unicidade por treino/dia. Dois treinos no mesmo dia geram duas conclusões e uma única data no calendário, com count=2. O feedback só é enviado após ação explícita, usa requestId estável e lock e verifica vínculo ativo e propriedade do treino; completionId precisa pertencer àquele treino. O destinatário continua determinado pelo professor responsável na relação existente. O texto permanece após falha e Agora não não desfaz a conclusão.

## Validação

- Typecheck aprovado.
- Build web aprovado, com bundle de aproximadamente 2,3 MB.
- Suíte Personal completa: 156 testes aprovados e uma falha preexistente de execução do launcher Prisma no Windows em import.test.ts (ENOENT).
- Bateria específica posterior: nove testes aprovados, incluindo a nova migração SQLite, séries variáveis e prazo absoluto com relógio simulado.
- Playwright: fluxo Focus completo aprovado com relógio simulado; clique duplo, recarga durante descanso, desfazer, zero segundos, final sem descanso, celebração, feedback com 503 e retry, idempotência, sessão inválida, calendário com dois treinos no mesmo dia, recebimento pelo professor e contexto da sessão. Verificados temas e larguras 320/390/768/1280 sem overflow.
- Regressões de navegador aprovadas: prescrição/cargas mobile e cópia de modelo com cargas, foto, compartilhamento, ranking e saída de grupo.
- PHP 8.3 lint: 30 arquivos aprovados. php:test não iniciou: MySQL sintético local 127.0.0.1:33316 recusou conexão. Não houve teste PHP/MySQL autenticado nem alteração em produção.
- docs:test: 31 aprovados, duas falhas EPERM de symlinks preexistentes no Windows.
- Export Android aprovado, com expo-audio e WAV incluídos no bundle; não equivale a teste em aparelho físico.
- docs:validate: 59 documentos válidos. code:inventory: 2911 entidades, 2385 relações e 5296 chunks de código. knowledge:build: 37 documentos indexáveis e 5333 chunks consolidados. code:check e knowledge:check aprovados. Nenhuma nova exclusão por sensibilidade; permanecem as três exclusões anteriores em api.ts e remembered-login.
- code:test: 17 aprovados e três falhas preexistentes (duas EPERM de symlinks e uma asserção de proveniência Git).
- git diff --check aprovado. Screenshots inspecionados, incluindo o conteúdo do feedback no professor.

## Screenshots locais

Dados exclusivamente sintéticos, sem contas do site. Artefatos ficam em data e não são indexados:

- data/student-execution-pending.png: exercícios minimizados.
- data/student-execution-light.png: tema claro.
- data/student-execution-rest.png: descanso integrado.
- data/student-execution-partial.png: um exercício concluído em vermelho.
- data/student-execution-complete.png: celebração e feedback opcional.
- data/student-execution-teacher-feedback.png: mensagem no professor responsável.

## Limitações e entrega

Sem funcionamento offline novo: falha na API mantém a série anterior e oferece recuperação. Armazenamento local bloqueado/indisponível impede recuperar o prazo após recarga, mas não apaga o progresso do servidor. A regra existente é uma sessão diária por treino; não foram criadas sessões repetidas independentes do mesmo treino no mesmo dia. Desfazer corrige as séries, preservando uma conclusão histórica já registrada e evitando segunda conclusão/notificação no dia.

O relógio é recalculado na retomada; som com navegador suspenso, tela bloqueada, modo silencioso ou após recarga não é garantido. Vibração depende da plataforma. O som web foi verificado no teste de navegador; reprodução nativa depende de novo binário com expo-audio e ainda exige teste em aparelho físico. Não foi habilitado microfone, serviço em segundo plano ou notificação local agendada. Duração total foi omitida porque o início da sessão não está disponível no backend.

Migração aplicada apenas ao banco SQLite sintético da prévia local. A migração MySQL será necessária em eventual publicação autorizada. Sem push, merge, deploy ou CI remota nesta tarefa. Prévia atualizada em http://127.0.0.1:3003/treinos, com dois exercícios sintéticos adicionados somente ao treino de demonstração. Login e consulta de prescrições verificados localmente com status 200; a sessão de verificação foi encerrada. Nenhum dado do site foi copiado.

Implementação salva no commit local 07d93f4, na branch feat/student-workout-execution. Esta revisão documental registra a entrega e as evidências posteriores, sem modificar fontes indexáveis nem exigir regeneração dos manifestos. O estado preexistente de Gradle e os arquivos pessoais continuam fora dos commits. As pendências de PHP/MySQL e aparelho físico permanecem explícitas; não se afirma validação desses ambientes nem publicação.
