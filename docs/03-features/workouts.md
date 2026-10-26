---
{
  "id": "ta-pago.docs.03-features.workouts",
  "title": "Treinos personalizados",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-26",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": [
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/sortable-exercises.web.tsx",
    "src/components/workouts/sortable-exercises.tsx",
    "server/workout-order.ts",
    "prisma/migrations/20261023180000_workout_editor/migration.sql",
    "server/workout-templates.ts",
    "src/components/workouts/prepared-workouts.tsx",
    "src/app/treinos-preparados.tsx",
    "tests/personal/workout-templates.test.ts",
    "prisma/migrations/20261023160000_workout_templates/migration.sql",
    "server/app.ts",
    "src/components/workouts/exercise-view.tsx",
    "src/components/workouts/series-editor.tsx",
    "server/workouts.ts",
    "src/features/personal/exercise-video.ts",
    "src/components/workouts/exercise-video.web.tsx",
    "src/components/workouts/exercise-video.tsx",
    "shared/workouts.ts",
    "prisma/schema.prisma",
    "prisma/migrations/20261020120000_workout_prescription/migration.sql",
    "src/components/workouts/plans.tsx",
    "src/components/workouts/plan-form.tsx",
    "src/components/workouts/exercise-library.tsx",
    "tests/personal/workouts.test.ts",
    "tests/personal/browser/app.spec.ts",
    "src/components/workouts/exercise-expansion.web.tsx",
    "tests/personal/workout-editor-migration.test.ts",
    "shared/workout-groups.ts",
    "src/components/workouts/workout-exercise-list.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/exercise-checkbox.web.tsx",
    "prisma/migrations/20261024120000_workout_groups/migration.sql",
    "tests/personal/workout-groups.test.ts",
    "src/app/alunos/[id]/treinos.tsx",
    "src/components/workouts/workout-screen.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "10.1.0",
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

Ao abrir uma rotina e escolher Adicionar treino, a tela apresenta somente o novo treino: nome, subtítulo, orientações e exercícios. Salvar treino acrescenta a sessão à rotina existente e retorna aos detalhes. Cancelar exige confirmação para descartar o rascunho. Os dados gerais e os demais treinos ficam fora dessa edição; continuam disponíveis em Editar plano.

## Estado e auditoria

Prescrição integrada ao módulo Personal existente: Expo 57/React Native, Expo Router, Express, Prisma 7/SQLite e Zod. Sessões usam cookies HttpOnly na web e SecureStore no nativo. User.role diferencia personal/student; Student.personalId e Student.accountId vinculam o cadastro profissional à conta do aluno, inclusive nos convites e cadastros públicos existentes.

Program não era uma rotina estruturada: guarda sessões em texto e é usado também por avaliações. Foi preservado, assim como registros de treinamento e demais abas. Cards, botões, campos, diálogos, tema claro/escuro, fontes e espaçamentos são reutilizados de personal/ui e constants/theme. Não há nova biblioteca visual nem dependência de drag-and-drop. Feed, desafios, GPS e geração automática continuam fora do escopo.

## Fluxo implementado

Personal → Alunos → perfil → Treinos → Criar treino → dados do plano → Adicionar treino → Adicionar exercício → biblioteca → cadastrar ou selecionar → configurar prescrição → Confirmar prescrição → Salvar plano.

Salvar com status ativo publica para a conta vinculada do aluno. Rascunhos permanecem privados. Datas distinguem planos atuais, futuros e encerrados; arquivamento mantém planos publicados acessíveis ao aluno. É possível ter vários planos ativos em paralelo. Um plano publicado não volta a rascunho.

Aluno → Treinos, ou perfil do acompanhamento → Treinos → selecionar sessão. Leitura inclui exercícios ordenados, orientações, imagem opcional e player de vídeo incorporado. Não existe edição de prescrição pela conta do aluno.

A biblioteca de adição e o cadastro de exercícios aparecem dentro da edição do plano, sem abrir um segundo modal. Isso evita disputa de foco entre janelas durante o preenchimento dos campos. Fechar biblioteca retorna à edição sem descartar o plano.

Na biblioteca, os exercícios começam recolhidos, mantendo nome, grupo, categoria e ações visíveis. Expandir exercício mostra instruções, imagem e vídeo; recolher desmonta o player para interromper a reprodução. Cada exercício pode ser expandido independentemente.

A biblioteca usa painel central com criação no topo, busca e filtros por grupos/categorias, opções derivadas dos exercícios cadastrados e limpeza de filtros. Linhas compactas mostram miniatura automática do YouTube, imagem cadastrada para outros vídeos (ou marcador de mídia quando indisponível), nome e etiquetas; expandir revela os detalhes e ações. As cores seguem o tema Tá Pago.

O cadastro oferece listas de grupos musculares e categorias com opções predefinidas e valores já cadastrados, mantendo entrada livre. Os filtros da biblioteca usam as mesmas opções. A política CSP permite imagens HTTP/HTTPS para miniaturas do YouTube e imagens cadastradas; frames continuam limitados ao player permitido.

## Treinos preparados do personal

A seção **Treinos preparados** (`/treinos-preparados`) permite criar, buscar, visualizar, editar e excluir modelos privados sem selecionar aluno. O editor reutiliza a biblioteca de exercícios e a prescrição (séries, repetições, carga, intervalo e orientações). É preciso confirmar a prescrição aberta e adicionar ao menos um exercício ativo antes de salvar. Cancelar pede confirmação de descarte.

No perfil do aluno → Treinos → **Usar treino preparado**, escolha um modelo para iniciar uma rotina. Também é possível usá-lo durante a edição de um plano existente. A seleção adiciona uma cópia independente, sem IDs de treino/prescrição ou feedbacks anteriores; revise nome do plano, datas e status e clique em **Salvar plano**. A rotina nova começa como rascunho e só é publicada quando salva como ativa. Alterar ou excluir o modelo não muda as cópias atribuídas; os dados descritivos do exercício continuam vindo da biblioteca compartilhada do personal.

`WorkoutTemplate` pertence ao personal e armazena nome, subtítulo, orientações, prescrições em JSON e revisão. A API `/api/workout-templates` oferece GET/POST e PUT/DELETE por ID, exige personal autenticado e verifica propriedade; a gravação valida exercícios ativos da própria biblioteca. Edição com revisão antiga retorna 409. Modelos com exercícios posteriormente arquivados aparecem indisponíveis para seleção até serem corrigidos; salvar um plano também revalida os exercícios. Nenhum modelo é exposto diretamente ao aluno.

A migration aditiva `20261023160000_workout_templates` cria somente a tabela e seu índice. Execute `npx prisma generate` e `npx prisma migrate deploy`, compile a web e reinicie a API. Não é necessário recriar alunos ou planos.

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

Imagem é cadastrada por URL, sem upload de mídia. Vídeos do YouTube (watch, youtu.be, Shorts, live e embed) são convertidos para o player incorporado, sem alterar o cadastro. Vídeos diretos MP4/WebM/OGV/M4V/MOV usam controles internos. Na web são usados iframe/vídeo HTML; Android/iOS usam react-native-webview 13.16.1 compatível com Expo 57. A reprodução começa por ação do usuário. Links não reconhecidos mantêm a alternativa externa. A disponibilidade e a permissão de incorporação dependem do provedor do vídeo. A CSP permite frames somente da própria aplicação e de www.youtube-nocookie.com. Testes nativos em dispositivos Android/iOS e publicação em hospedagem não fazem parte da execução local. O lint usa ESLint 9 e eslint-config-expo 57; diagnósticos herdados de migração dos hooks permanecem como avisos nos arquivos explicitados na configuração.

## Feedbacks após o treino

Cada treino possui histórico de comentários com data e hora de registro no servidor. O aluno vinculado envia em Terminei: enviar feedback; o personal proprietário consulta no botão Feedbacks. O comentário é obrigatório, com limite de 2000 caracteres. Não há avaliação automática nem contagem de execução baseada no comentário.

POST /api/me/workouts/:id/feedbacks exige aluno titular, vínculo ativo, treino não removido e rotina ativa publicada. Uma chave por tentativa evita duplicação ao reenviar após falha de rede. Rotinas arquivadas e vínculos encerrados preservam a leitura autorizada do histórico, mas não recebem novos comentários. A autorização do personal continua sendo revogada com o vínculo. A migration 20261022120000_workout_feedback cria a tabela ligada ao treino; exclusão definitiva do acompanhamento remove os registros em cascata. A exportação de planos inclui os feedbacks dos treinos presentes.

## Séries e presets no exercício expandido

Na janela do treino, o personal edita linhas com série/repetições (por exemplo, 3/15 ou 3/8-12), carga em kg e intervalo em segundos. Adicionar série cria uma linha, Replicar séries duplica a última, e excluir remove uma linha mantendo pelo menos uma. Salvar prescrição persiste as linhas usando o controle de revisão da rotina; alterações ainda não salvas não mudam a prescrição do aluno. Campos vazios de carga e intervalo permanecem não informados. Até 50 linhas são aceitas.

Salvar como preset grava as linhas na conta do personal, sem alterar o plano. Adicionar preset acrescenta as linhas escolhidas à edição atual; a lista é privada por proprietário e indisponível para alunos. O aluno consulta as linhas salvas, sem controles de edição. Prescrições antigas continuam legíveis pelos campos originais; não há conversão automática dos dados existentes. A migration 20261022130000_prescription_series adiciona series ao WorkoutExercise e a tabela PrescriptionPreset.


## Edição compacta de exercícios

O WorkoutEditor compartilhado por planos e modelos preparados apresenta handle, seleção, nome, ações e expansão individual. Os detalhes ficam montados e ocultos ao recolher, preservando os valores de séries ainda não confirmados. Expandir todos e Recolher todos alteram somente a visualização. Confirme séries e prescrições abertas antes de salvar o formulário.

Na web, @dnd-kit/core, @dnd-kit/sortable e @dnd-kit/utilities permitem arrastar somente pelo handle com mouse ou toque prolongado. Alt + seta para cima/baixo e os botões no detalhe oferecem reordenação por teclado. A versão nativa reutiliza PanResponder do React Native, com toque prolongado no handle e prévia da posição. Transições da web respeitam movimento reduzido; a versão nativa não adiciona animação. Validação em dispositivos Android/iOS físicos permanece necessária.

Ao soltar um item de uma lista já persistida e com as mesmas associações, o editor grava somente a ordem. PUT /api/workout-templates/:id/order e PUT /api/workout-plans/:id/workouts/:workoutId/order exigem revisão atual e permutação exata dos IDs. O backend valida proprietário e vínculo ativo, atualiza a revisão e grava em transação. Falhas restauram a ordem visual anterior e preservam o formulário. Listas novas, ou com associações adicionadas/removidas ainda não salvas, persistem junto com o formulário e informam esse estado ao personal. Modelos não alteram cópias já prescritas.

O menu de ações fecha por Escape, clique fora ou botão Fechar. Trocar exercício abre a biblioteca e exige confirmação; mantém a prescrição para revisão profissional. Adicionar preset aplica a configuração salva; Salvar como preset guarda séries, campos originais e observações na biblioteca privada de presets existente. Presets antigos de séries continuam compatíveis. O backend reutiliza um preset idêntico com o mesmo nome, configuração e séries. A exclusão requer confirmação e remove somente a associação quando o formulário é salvo.

Adicionar exercício alternativo vincula uma entrada ativa da mesma biblioteca ao principal, sem criar outra posição no treino. O aluno consulta a alternativa na prescrição expandida. A migration 20261023180000_workout_editor adiciona uma relação opcional em WorkoutExercise, configuration opcional em PrescriptionPreset e IDs estáveis às entradas JSON dos modelos existentes. Não remove registros nem altera suas prescrições.


## Seleção, combinação e ações em lote

WorkoutExerciseList é a lista compartilhada pela janela principal do treino e pelo WorkoutEditor dos formulários de plano/modelo. Cada exercício ou bloco tem checkbox real na web, seleção acessível no nativo e handle de arraste. A barra de seleção permite selecionar todos, limpar seleção, combinar, separar e excluir os marcados. A exclusão exige confirmação e afeta somente as associações do treino; não remove exercícios da biblioteca.

Combinar preserva IDs e todas as prescrições individuais. Os selecionados são reunidos na posição do primeiro marcado, mantendo a ordem relativa dos selecionados e dos demais exercícios. Um bloco combinado mostra os nomes no mesmo cabeçalho e se move inteiro. Ao expandir, cada exercício mantém suas séries, cargas, descansos, observações e alternativas. Separar desfaz somente o agrupamento. Remover um membro de um par dissolve o bloco que ficaria unitário. O aluno vê os blocos e as prescrições, sem controles de seleção ou edição.

Na janela principal, reordenação, combinação, separação e exclusão salvam imediatamente pelos endpoints existentes, com atualização otimista, bloqueio durante a gravação e restauração em erro. Os formulários completos preservam o salvamento explícito do plano/modelo; se houver grupos ainda não salvos, a ordem também aguarda esse salvamento. Prescrições de séries ainda não confirmadas bloqueiam operações que desmontariam os campos. A seleção e a expansão usam identidades estáveis.

O arraste web usa prévia flutuante fora do recorte do modal, movimento vertical e reorganização dos demais blocos. Mouse, toque prolongado, Alt + setas e botões acessíveis são suportados. Animações respeitam movimento reduzido. A identidade visual existente é preservada.

A migration 20261024120000_workout_groups adiciona groupId opcional em WorkoutExercise; modelos preparados armazenam o mesmo campo no JSON existente. Grupos precisam ser contíguos e conter pelo menos dois itens. Os schemas e os endpoints de ordem rejeitam fragmentação. Agrupamento e exclusão em lote reutilizam as transações e autorizações dos planos/modelos, mantendo a independência entre alunos e cópias.


## Gestão dos membros combinados

Ao selecionar uma ocorrência, a barra normal é substituída por Combinar e Excluir, com quantidade, limpeza de seleção e separação quando aplicável. A seleção usa IDs das ocorrências; duas prescrições do mesmo exercício continuam independentes. O checkbox do grupo permite selecionar ou desmarcar todos os membros.

Dentro do grupo expandido, cada membro possui checkbox, handle, detalhes e menu próprios. É possível reordenar internamente, retirar um membro preservando sua prescrição, mover uma ocorrência existente para o grupo ou adicionar outra pela biblioteca e pelo formulário de prescrição existentes. Separar todos mantém os exercícios e a ordem; grupos unitários são dissolvidos. Duplicar cria outra ocorrência com cópia independente das séries. Editar usa PrescriptionForm.

Na janela Ver exercícios, essas operações persistem no plano existente com revisão, autorização e rollback em erro. Adicionar pela biblioteca reaproveita PlanForm com o grupo de destino e exige Salvar plano. Não há nova página ou biblioteca paralela. O servidor pode identificar a release pelo header X-TaPago-Release e envia o HTML sem cache para evitar uma shell antiga.


## Fluxo de treinos em telas

WorkoutScreen organiza as etapas com título e retorno, sem Modal ou backdrop. O Personal navega do perfil à página de treinos, à rotina e ao treino. As etapas do formulário de plano, biblioteca, prescrição, presets e destino de grupo ocupam o conteúdo da página. Durante a biblioteca/prescrição, a lista e os demais campos do plano ficam ocultos e montados para preservar o rascunho; as ações gerais de salvar reaparecem ao confirmar ou cancelar a etapa. As confirmações destrutivas e os menus rápidos de ações permanecem sobreposições pontuais. A nova rota está no grupo protegido de Personal; a autorização dos dados continua nos endpoints existentes.
