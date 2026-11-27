---
{
  "id": "ta-pago.docs.07-ai.task-student-workouts-list",
  "title": "Lista compacta de Meus treinos do aluno",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": ["07-ai"],
  "indexable": false,
  "sources": ["src/app/treinos.tsx", "src/components/student/program-list.tsx", "src/components/student/list-styles.ts", "src/components/student/page-header.tsx", "src/components/workouts/plans.tsx", "src/components/personal/shell.tsx", "src/components/student/layout.tsx", "src/constants/focus.ts", "tests/personal/browser/app.spec.ts"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "ai_agent", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.03-features.personal-integration", "ta-pago.docs.07-ai.task-student-focus"],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Lista compacta de Meus treinos do aluno

## Objetivo, escopo e estado inicial

Implementar a lista de programas prescritos na linguagem Focus, seguindo a solicitação anexada. A análise confirmou que /treinos já atendia à finalidade por WorkoutPlans, que consulta GET /me/workout-plans e abre PlanDetails e WorkoutWindow. A mudança adapta essa entrada e preserva a execução de exercícios. A documentação versionada do Expo 57 foi consultada antes da edição.

Estado inicial: branch feat/professional-studio-layout, commit 4ef8725. Foi criada a branch local feat/student-workouts-list. A alteração de Gradle e os arquivos pessoais preexistentes foram preservados. O pedido proíbe merge, push e deploy sem autorização; nenhuma dessas operações integra esta entrega.

## Arquivos e componentes

Criados:

- src/components/student/program-list.tsx: WorkoutProgramList, WorkoutProgramListItem, WorkoutProgramListSkeleton e WorkoutEmptyState.
- src/components/student/list-styles.ts: estrutura centralizada de linhas compactas, textos, iconografia e estados.
- src/components/student/page-header.tsx: StudentPageHeader com título e seta acessível.

Modificados:

- src/app/treinos.tsx: cabeçalho Focus e controle dos parâmetros rotina/treino.
- src/components/workouts/plans.tsx: lista compacta na perspectiva do aluno e estado de recarga, preservando a consulta, o detalhe e a execução existentes.
- src/components/personal/shell.tsx: propriedade opcional contentStyle em Page, com os padrões anteriores preservados.
- tests/personal/browser/app.spec.ts: cenários da lista e ajustes de seletores/navegação dos fluxos existentes.
- docs/03-features/personal-integration.md e manifestos de conhecimento: comportamento observado e inventário das novas fontes.

Reutilizados: StudentLayout e Brand, Focus/FocusColors, Page, IconButton, StudioAction, studioWebProps e sua transição de 180 ms com foco visível e redução de movimento, Lucide por importações individuais, formatDate, dateSchema, useResource, WorkoutPlans, WorkoutRoute, PlanDetails e WorkoutWindow. Não foi adicionada dependência.

## Decisões arquiteturais e visuais

O componente existente continua responsável pelos planos autorizados e sua abertura. A variante do aluno apresenta todas as prescrições publicadas devolvidas pela API, incluindo o histórico arquivado, como linhas com divisórias discretas. Cada linha tem placa de 42 px, haltere de 22 px, título de 16 px, datas e objetivo de 12 px e chevron de 18 px. Nomes e objetivos extensos ampliam a altura sem cortar conteúdo. O corpo mantém a largura máxima Focus e espaços horizontais de 24 px.

A data de término ausente aparece como Sem término, sem inventar uma data; objetivo ausente é omitido. As datas são verificadas pelo validador existente antes de formatDate. O ícone é uniforme, pois não existe classificação estruturada de programas para essa decisão. A lista não contém filtros adicionais, botões Ver treino, indicadores de desempenho ou introduções.

A seleção usa WorkoutRoute e parâmetros da própria rota /treinos, mantendo o comportamento de recarga e histórico do navegador. Os identificadores são procurados exclusivamente na resposta autorizada. A navegação inferior já reconhece essa seção e permanece destacada nos detalhes. O retorno do cabeçalho direciona à tela inicial. Não há novo fluxo de execução, novo endpoint, mudança de contrato, migração ou alteração em prescrições e permissões.

## Testes e inspeção

Os cenários novos provisionam contas e prescrições sintéticas no backend de teste, sem respostas simuladas para os dados da lista. A lista deve mostrar somente os planos publicados da conta vinculada; rascunhos e planos de outra conta ficam ausentes, inclusive ao fornecer um ID estrangeiro na URL. Os testes cobrem nomes, datas, objetivo, ausência de término/objetivo, seleção por Enter e pela borda direita da linha, detalhes existentes, recarga, retorno do navegador e retorno ao início.

O cenário de estados retém temporariamente a requisição real para observar skeletons, depois libera a API real para observar o vazio. Uma resposta 503 é usada somente para testar erro e nova tentativa. O aplicativo final não inclui dados simulados. O cenário responsivo cobre 320, 390, 768 e 1280 px, ambos os temas, nomes e objetivos longos, movimento reduzido, ausência de rolagem horizontal e conteúdo sem sobreposição da navegação. Erros de execução e console são coletados no fluxo principal.

As verificações existentes de convite e liberação, prescrição completa/feedback e preparação de treino com cargas e progresso foram executadas como regressão. A seleção antes local passou a persistir na URL, por isso os testes não devem reabrir um plano após recarregar um detalhe já selecionado. Uma verificação antiga procurava a notação 4/10 como texto e valores brutos de carga/intervalo; foi atualizada para a interface de execução já existente: quatro séries restantes, dez repetições, campo de carga e botão de intervalo. Essa interface não foi modificada.

A inspeção visual usa dados sintéticos criados pela API real de teste. As capturas locais, não versionadas, estão em data/student-workouts-mobile-dark.png, data/student-workouts-mobile-light.png, data/student-workouts-tablet-dark.png, data/student-workouts-desktop-dark.png, data/student-workouts-mobile-320-long.png, data/student-workouts-loading.png, data/student-workouts-empty.png e data/student-workouts-error.png. Foram comparadas a geometria, a hierarquia Focus, a logo original e os estados.

Cinco cenários de navegador passaram: lista/dados/navegação/responsividade, estados, convite/liberação, prescrição/feedback e preparação/publicação/progresso de treino. O teste principal final passou também com a coleta de console e a verificação de que a última linha permanece acima da navegação ao rolar. Não foram observados erros de execução ou console nesse fluxo.

personal:build e typecheck passaram. docs:validate aprovou 58 documentos, e code:inventory gerou 2845 entidades e 2361 relações, sem novas exclusões por sensibilidade. knowledge:build consolidou 37 documentos indexáveis e 5243 chunks; code:check e knowledge:check passaram. docs:test teve 31 sucessos e duas falhas por falta de permissão para links simbólicos no Windows. code:test teve 17 sucessos e três falhas já observadas no ambiente: duas de links simbólicos e uma de proveniência Git. Essas falhas foram registradas, sem alterar extratores ou omitir verificações.

## Limites e entrega

Não houve teste físico de Android/iOS ou nova integração com MySQL de produção: banco e backends não foram alterados. O endpoint existente e seus controles continuam os mesmos. A prévia local usa somente o banco de demonstração já existente. Não foram utilizados dados ou credenciais de produção. O trabalho permanece nesta branch local, sem push ou deploy.
