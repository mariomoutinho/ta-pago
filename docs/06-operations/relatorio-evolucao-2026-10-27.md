---
{
  "id": "ta-pago.docs.06-operations.relatorio-evolucao-2026-10-27",
  "title": "Relatório de evolução — agosto a outubro de 2026",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-27",
  "language": "pt-BR",
  "tags": ["06-operations", "retrospectiva"],
  "indexable": true,
  "sources": [
    "package.json",
    "README.md",
    "docs/03-features/workouts.md",
    "docs/03-features/enrollment-links.md",
    "docs/03-features/personal-integration.md",
    "docs/06-operations/hostinger-deployment.md",
    "docs/07-ai/task-workout-runtime-fix.md",
    "docs/01-requirements/functional-requirements.md",
    "docs/02-architecture/navigation.md",
    ".github/workflows/documentation.yml",
    "tests/personal/browser/app.spec.ts",
    "tests/personal/workouts.test.ts",
    "tests/personal/workout-templates.test.ts",
    "tests/personal/program-routines.test.ts",
    "tests/personal/series-types.test.ts",
    "tests/personal/access.test.ts",
    "tests/personal/enrollment.test.ts",
    "tests/personal/import.test.ts",
    "tests/personal/production.test.ts",
    "scripts/docs/lib.test.mjs",
    "scripts/code/lib.test.mjs",
    "scripts/rag/postgres.test.mjs",
    "scripts/rag/rag.test.mjs",
    "docs/06-operations/evidencias/2026-10-27-validacoes.json"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "reviewer", "product", "operations"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.03-features.workouts", "ta-pago.docs.02-architecture.navigation"],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "operations"
}
---

# Relatório de evolução — agosto a outubro de 2026

## Período, fontes e leitura dos resultados

Período solicitado: **27/08/2026 a 27/10/2026**, dois meses corridos, no fuso America/Sao_Paulo. Foram encontrados **36 commits** alcançáveis na branch main. O primeiro é de 21/09; não foram encontrados commits nessa branch entre 27/08 e 20/09. O corte analisado é **f3633e10cd5419fb9875d0c62ef81bfc3a442036**, anterior ao próprio relatório.

As histórias abaixo foram reconstruídas a partir do histórico Git, arquivos do projeto, registros técnicos e validações locais. Seus IDs HU-EVO são identificadores deste relatório, sem substituir os requisitos RF existentes. Mudanças sucessivas de uma mesma necessidade foram agrupadas para mostrar o problema, a solução e os critérios de aceite.

**Passou** significa execução local comprovada; **falhou** significa que a execução terminou sem satisfazer o critério; **não executado/bloqueado** não equivale a aprovado nem a defeito confirmado no produto. A existência de um teste ou a mensagem de um commit, isoladamente, não prova aprovação.

Os testes atuais foram executados em Windows, PowerShell e Node.js 24.19.0. O navegador usado foi Edge, controlado pelo Playwright. Testes usam dados fictícios e bancos temporários. Não houve alteração de código do aplicativo, correção de testes, implantação pública nem execução de knowledge:api ou knowledge:evaluate para elaborar este relatório.

## Resultado atual das validações

| Verificação executada em 27/10 | Resultado observado | Interpretação |
| --- | --- | --- |
| npm run typecheck | Passou | Tipos da interface válidos. |
| npm run personal:typecheck | Passou | Tipos da API válidos. |
| npm run personal:build | Passou | Exportação web concluída; não comprova instalação nativa ou hospedagem. |
| npm run docs:validate | Passou: 46 documentos antes deste relatório | Estrutura documental válida naquele corte. |
| npm run docs:test | 31 passaram; 2 falharam | As duas falhas envolvem criação de links simbólicos, recusada no Windows com EPERM. |
| npm run code:test | 17 passaram; 3 falharam | Duas falhas com links simbólicos; uma asserção de proveniência não lançou a exceção esperada. |
| npm run personal:test | 58 passaram; 2 falharam; 32 não executados | 8 arquivos passaram e 5 falharam. Três suítes falharam na preparação e dois casos falharam individualmente por spawnSync do Prisma. |
| npx playwright test --reporter=json | **17 passaram; 3 falharam; 0 ignorados; 0 classificados como instáveis** | Execução completa de 20 cenários; não apenas os últimos testes isolados. |
| npm run rag:test | 22 passaram; 1 falhou | A conexão com o PostgreSQL de teste em 127.0.0.1:5433 foi recusada. Os testes locais/WASM passaram. |

As contagens de suítes diferentes não devem ser somadas como se fossem cobertura funcional: existem testes de infraestrutura, testes de casos e subtestes. O resumo estruturado e os 20 resultados individuais estão em [evidências de validação](evidencias/2026-10-27-validacoes.json).

Há um **registro histórico**, em [task-workout-runtime-fix](../07-ai/task-workout-runtime-fix.md), de 87 testes de domínio/API, 33 documentais, 20 de código e 13 cenários de navegador aprovados no WSL. Esse registro explica uma validação anterior; não substitui os resultados atuais no Windows. A suíte e o produto cresceram desde então. A CI remota não foi auditada nesta coleta e não é declarada aprovada.

## Histórias de usuário, critérios e soluções

### HU-EVO-01 — Base técnica e documentação rastreável

**Como desenvolvedor, quero uma base reproduzível com documentação e evidências de código para evoluir o projeto sem depender de suposições.**

Commits: 4078ff7, aaa87fe, dda35b2 e 719c244.

- Demanda: organizar o repositório, contratos, requisitos, inventário de código e metadados de origem.
- Solução: catálogo documental, extratores separados, manifesto consolidado e IDs estáveis. O commit 719c244 incluiu os tipos do Expo para corrigir a verificação de tipos em checkouts limpos.
- Critérios atendidos: TypeScript da aplicação/API passa; 31 testes documentais e 17 do inventário passam, incluindo estrutura, hashes, relações, exclusões e comparação incremental.
- Falhas atuais: links simbólicos não podem ser criados pelo processo de testes; a asserção de SHA inventado falha. A causa desta última ainda não foi determinada. **Situação: base implementada, validação auxiliar incompleta.**

### HU-EVO-02 — Consulta local de conhecimento sem API paga

**Como desenvolvedor, quero recuperar fontes locais com caminhos e linhas para responder sobre o projeto sem depender de banco ou API externa.**

Commits: 64b1b6b e a63880b.

- Demanda: disponibilizar recuperação de documentação/código e separar o modo local do pipeline opcional com banco e modelos.
- Solução: busca local que entrega contexto ao Codex, além de ingestão incremental, filtros, relações, contexto e providers separados na camada RAG.
- Critérios atendidos: recuperação local sem provider; CLI com rede proibida; validação de vetores; deduplicação; rollback; filtros; orçamento de contexto e fontes verificadas passaram nos testes correspondentes.
- Falha atual: conexão PostgreSQL recusada em 127.0.0.1:5433. **Situação: modo local validado; integração com servidor PostgreSQL pendente de ambiente e repetição.**
- Limite: os providers usados nos testes são exclusivos de teste. O resultado não prova qualidade semântica ou segurança de respostas de modelos reais, nem integração de IA ao produto fitness.

### HU-EVO-03 — Acompanhamento Personal integrado

**Como personal, quero cadastrar e acompanhar alunos; como aluno, quero consultar meu histórico e controlar o vínculo com o profissional.**

Commit: 127bf16.

- Demanda: incorporar o acompanhamento antes separado ao Tá Pago, com contas, avaliações, registros e persistência.
- Solução: interface integrada, API Express, SQLite/Prisma, autorização por proprietário e vínculo, histórico e importação do sistema anterior.
- Critérios atendidos na coleta atual: cadastro e persistência no navegador; perfil com atalhos, opções e anotações; leitura da prescrição pelo aluno e impedimentos cobertos pela suíte de treinos aprovada.
- Critérios ainda sem comprovação nesta execução: 4 casos de acesso, 16 da API geral e 12 de cadastro público não chegaram às suas asserções, pois a preparação do banco falhou. O teste de importação também falhou antes de validar a transferência.
- **Situação: funcionalidade implementada; validação completa de acesso, registros e importação bloqueada no Windows.** Isso não é uma conclusão de vulnerabilidade, mas uma lacuna de evidência que precisa ser fechada.

### HU-EVO-04 — Cadastro por link e aprovação

**Como personal, quero compartilhar um formulário e aprovar solicitações; como aluno, quero enviar meu cadastro sem duplicar minha conta.**

Commit: 9d6dba7.

- Demanda: link compartilhável, formulário em cinco etapas e gestão de pendentes.
- Solução: geração/rotação de link, ficha protegida, consentimentos, aprovação e regras de associação e retenção; compartilhamento com clipboard e alternativas disponíveis.
- Critério atendido: o cenário de navegador do formulário público em cinco etapas até a aprovação passou. Os testes de compartilhamento simulados integram a suíte aprovada.
- Falha atual: os 12 testes dedicados de enrollment foram bloqueados no setup do Prisma. Criptografia, expiração, retenção e rate limit possuem testes escritos, mas não foram aprovados por essa execução bloqueada.
- **Situação: fluxo principal web validado; validação dedicada de todas as proteções pendente.** O link local não é uma publicação na internet.

### HU-EVO-05 — Preparação para hospedagem

**Como responsável pela operação, quero publicar o aplicativo com API, banco persistente e HTTPS, sem perder os dados em um novo deploy.**

Commit: b15279c.

- Demanda: preparar uma aplicação completa para a Hostinger, incluindo a API.
- Solução: entrada de produção, validação de variáveis, PORT/host, verificação de saúde e exigência de caminho persistente para o banco.
- Critérios atendidos: casos de configuração da porta e rejeição de produção insegura passam. A exportação web também passou.
- Falha atual: o teste que inicia a entrada real da hospedagem, verifica SPA e cookie Secure falhou na preparação do Prisma. DNS, certificado, volume persistente e publicação pública não foram verificados nesta auditoria.
- **Situação: preparação implementada; publicação pública não comprovada.** O roteiro necessário está no [guia de hospedagem](hostinger-deployment.md).

### HU-EVO-06 — Rotinas e adição de treinos com contexto

**Como personal, quero organizar treinos por aluno e adicionar uma sessão sem precisar editar a rotina inteira.**

Commits: 2785f26, 3a7e00f, 029f4e0, cd841d7, 7f150e0 e 9a1679b.

- Demanda: prescrição estruturada, rotinas legíveis, retorno entre etapas e formulário específico para adicionar treino.
- Solução: planos, sessões e exercícios com rascunho/publicação; cartões de rotina; etapas em tela; URL com rotina/treino; formulário limitado à nova sessão quando se escolhe Adicionar treino.
- Critérios atendidos: prescrição completa no mobile com leitura do aluno; adicionar somente a nova sessão, salvar e preservar a rotina; validação de datas, publicação e edição concorrente na suíte da API de treinos.
- Falha atual: o cenário que usa voltar, avançar e recarregar não encontra Detalhes de Remada. A implementação da navegação não permite declarar esse critério aprovado hoje. É necessário investigar sincronização da URL/estado e do próprio teste.
- **Situação: prescrição e adição de sessão validadas; retorno pelo histórico do navegador pendente.**

### HU-EVO-07 — Biblioteca compacta e vídeos incorporados

**Como personal, quero localizar exercícios em uma lista compacta e abrir os vídeos sem sair do aplicativo.**

Commits: a9f3886, 962ffad, 49fdc5f, 905922f, ff5885c e 5eb7f1c.

- Demanda: evitar uma tela tomada por vídeos, corrigir miniaturas e impedir formulários sobrepostos.
- Solução: lista com expansão, miniaturas, classificações e player incorporado. Ajustes nas permissões de mídia permitem miniaturas e vídeos; o cadastro deixou de disputar foco entre modais.
- Critérios atendidos: player YouTube visível dentro da biblioteca; reconhecimento/rejeição de URLs e CSP nos testes de vídeo; miniatura gerada sem montar o player; fluxo de cadastro e prescrição no navegador.
- **Situação: critérios web verificados.** Reprodução em dispositivos físicos e disponibilidade de vídeos externos continuam dependendo de validação própria.

### HU-EVO-08 — Feedback após o treino

**Como aluno, quero comentar como foi meu treino; como personal, quero consultar esse retorno no histórico da sessão.**

Commit: 95422b0.

- Demanda: registrar um retorno relacionado ao treino efetivamente prescrito.
- Solução: comentários com data/hora, identificação da tentativa para evitar duplicação e acesso por vínculo ativo.
- Critérios atendidos: feedback exclusivo do aluno vinculado, persistência, repetição idempotente e leitura autorizada; o cenário completo de prescrição pelo navegador também passou.
- **Situação: critérios cobertos pela suíte de treinos aprovados.** Um comentário não foi convertido em contagem automática de execução ou avaliação clínica.

### HU-EVO-09 — Presets e séries com campos apropriados

**Como personal, quero aplicar presets ou montar séries por tipo, preenchendo apenas os atributos necessários para aquele exercício.**

Commits: 5d4d07c, d3012bf e 27d07f1.

- Demanda: reduzir campos excessivos e tornar visível a ação Adicionar ao treino, seguida da escolha de preset.
- Solução: sete tipos de linha, replicação/exclusão, presets privados e cinco modelos padrão; botão permanente em cada exercício; busca e prévia dos valores salvos. Alongamento começa com a sugestão de repetições e tempo.
- Critérios atendidos: compatibilidade com linhas antigas; validação dos sete tipos; cópias independentes; persistência de séries/presets; aplicação direta em treinos de aluno e preparados. Os três cenários de navegador específicos passaram.
- **Situação: critérios específicos aprovados.** Os valores dos modelos são editáveis; o aplicativo não os valida como uma recomendação de treino adequada para qualquer aluno.

### HU-EVO-10 — Início simples e utilizável no celular

**Como personal, quero acessar as tarefas principais pelo celular sem itens cortados, indicadores dispensáveis ou blocos sobrepostos.**

Commits: 24655e3, 9861e88 e 21fdf4e.

- Demanda: reorganizar os atalhos e remover elementos que o usuário considerou sem utilidade.
- Solução: início por seções; retirada do menu horizontal em telas menores, de Próximos cuidados e do resumo de indicadores; logo com retorno ao início; atalho de treinos preparados. As colunas do painel passaram a usar altura natural no mobile para corrigir a sobreposição de Acompanhamento.
- Critérios atendidos: navegação pelos atalhos, retorno pelo logo, ausência do menu mobile e teste de largura sem rolagem horizontal em 320, 390, 768 e 1280 px. O cenário atual do painel passou.
- **Situação: critérios do painel aprovados em navegador.**

### HU-EVO-11 — Alunos e perfil com visão objetiva

**Como personal, quero buscar meus alunos e abrir as informações importantes sem percorrer uma ficha extensa.**

Commits: 13b9b06 e 8a0b445.

- Demanda: lista compacta com busca/filtros e perfil com atalhos.
- Solução: listagem por nome, e-mail e telefone, estados de acompanhamento, resumo do perfil e acesso organizado a prontuário e anotações.
- Critério atendido: o cenário de perfil compacto passou.
- Falha atual: o cenário da lista termina procurando o link Alunos no menu mobile e sua cor de fundo. Esse menu foi removido por solicitação posterior. A expectativa final está desatualizada; isso, por si só, não demonstra falha na busca ou nos filtros.
- **Situação: perfil validado; teste completo da lista precisa ser atualizado e repetido.**

### HU-EVO-12 — Edição, grupos e reutilização de treinos

**Como personal, quero preparar modelos, reordenar exercícios e manipular blocos combinados sem perder prescrições ou afetar outro aluno.**

Commits: d5b3584, 2d2f89b e c03c4dc.

- Demanda: arraste, ações em lote, duplicação e gestão dos membros dos grupos na interface realmente usada.
- Solução: lista compartilhada, seleção contextual, IDs estáveis, blocos contíguos, ações de membros, endpoints de ordem com revisão e restauração em erro. A correção de runtime também tratou a entrega da SPA em diretório de release oculto.
- Critérios atendidos agora: editor compacto com rollback; arraste com mouse/toque; seleção e exclusão em lote; combinação/separação de modelos; cópia de treino preparado sem alterar a origem. Esses cenários passaram, assim como as suítes de grupos e modelos.
- Registro histórico: o relatório do commit c03c4dc documenta a falha sendFile da SPA e a solução de raiz dist explícita, seguida de repetição aprovada no ambiente WSL.
- **Situação: operações centrais aprovadas; a navegação voltar/avançar da HU-EVO-06 continua pendente.**

### HU-EVO-13 — Programas como rotinas reutilizáveis

**Como personal, quero que um programa contenha treinos completos e possa ser adaptado para um aluno.**

Commit: fe0693c.

- Demanda: programas eram principalmente texto, sem sessões estruturadas.
- Solução: treinos em Program.workouts, controle de revisão, editor compartilhado e cópia para o plano do aluno; preservação do texto anterior, dos vínculos e dos snapshots históricos.
- Critérios atendidos: adicionar dois treinos a programa anterior; persistir exercícios e presets; copiar para um aluno sem alterar a origem; recusar biblioteca de outro profissional, revisão desatualizada e exclusão de rotina vinculada. O teste de API e o cenário de navegador passaram.
- **Situação: critérios específicos aprovados.** Vincular Programa vigente no cadastro não publica automaticamente uma prescrição: a cópia é feita pela ação própria e revisada antes da publicação.

### HU-EVO-14 — Prévia de modelos recolhida

**Como personal, quero uma visão geral dos exercícios de um treino preparado, abrindo os vídeos somente quando necessário.**

Commit: 3e4e292.

- Demanda: Ver modelo mostrava todos os vídeos, dificultando a visão geral.
- Solução: lista inicialmente recolhida; expansão individual e geral; suporte a blocos; desmontagem dos players ao recolher. A prévia permanece sem ações de edição.
- Critérios atendidos: zero iframes ao abrir; um player ao expandir um exercício; todos ao expandir a lista; zero ao recolher; grupos com membros independentes; reabertura recolhida e dados/revisão inalterados. O cenário de navegador passou.
- **Situação: critérios da prévia aprovados.**

### HU-EVO-15 — Alternância de tema

**Como usuário, quero alternar entre claro e escuro pelo botão ao lado de Sair e manter minha preferência.**

Commit: f3633e1.

- Demanda: permitir escolha manual, além do tema do sistema.
- Solução: provider compartilhado entre interface e navegação; botão sol/lua à esquerda de Sair; persistência web/nativa e fallback de sessão quando o armazenamento falha.
- Evidência anterior: os dois cenários selecionados passaram durante a implementação, incluindo alternância e recarga.
- Resultado da suíte completa atual: o teste do tema falhou porque o deslocamento vertical entre os botões foi exatamente **2 px**, enquanto a asserção exige menos de 2 px. As etapas anteriores de troca para claro, recarga e navegação haviam passado; o teste interrompeu antes dos passos finais de retorno ao escuro.
- **Situação: implementada, com validação completa atual parcial.** Revisar o alinhamento e a sensibilidade geométrica do teste; não apenas relaxar o limite sem verificar o layout. Persistência e comportamento em aparelhos nativos ainda exigem teste físico.

## Falhas abertas e correções necessárias

As ações abaixo são **demandas propostas**, não soluções já executadas por este relatório.

| ID / prioridade sugerida | Falha ou lacuna | Ação e critério para encerrar |
| --- | --- | --- |
| DEM-01 / P0 — antes de liberar produção | 32 testes de acesso/API/cadastro público não executados; importação e entrada de produção falham no setup | Substituir a execução direta de node_modules/.bin/prisma nos cinco arquivos afetados pela chamada compatível ao Node/CLI Prisma, como já ocorre nas suítes de treinos. Reexecutar os 92 casos e comprovar isolamento, vínculos, retenção e importação. Sem alegar vulnerabilidade apenas pelo bloqueio. |
| DEM-02 / P1 | Após voltar, avançar e recarregar, Detalhes de Remada não aparece | Reproduzir com URL e estado de rotina/treino, verificar sincronização de navegação e esperas do teste; aprovar todo o cenário de gestão de membros após recarga. |
| DEM-03 / P1 | Teste da lista ainda exige o menu mobile removido | Atualizar a expectativa para o desenho aprovado e verificar busca/filtros, tema, retorno ao início e ausência de overflow; repetir o cenário completo. |
| DEM-04 / P1 | Teste do tema falha no limite de 2 px | Inspecionar alinhamento, área de toque e fontes em 320/390/768/1280 px. Corrigir layout ou critério geométrico justificado e concluir os dois sentidos da alternância, recarga e persistência. |
| DEM-05 / P1 | Quatro testes auxiliares esbarram em symlink EPERM | Preparar ambiente de testes com suporte a links simbólicos ou executar esses casos em Linux, com diagnóstico explícito no Windows; preservar a cobertura contra links inseguros. Não remover o teste para obter uma aprovação artificial. |
| DEM-06 / P1 | Teste de SHA falso não lança a exceção esperada | Investigar proveniência e execução Git nos fixtures, inclusive tratamento de erros. Aprovar rejeição de SHA inventado e consistência com a revisão-base real. Causa ainda não determinada. |
| DEM-07 / P1 | PostgreSQL de teste em 5433 indisponível | Disponibilizar banco dedicado de teste com pgvector e configuração correta, ou indicar claramente sua indisponibilidade. Aprovar ingestão concorrente, filtros e rollback no servidor real. Não confundir aprovação WASM com aprovação do servidor. |
| DEM-08 / P1 | CI remota não auditada nesta coleta | Conferir os jobs do commit analisado e, após as correções, executar a matriz necessária. A configuração atual usa Ubuntu/Node 24 e PostgreSQL; considerar Windows para evitar regressão da CLI. Critério: evidências dos jobs, não apenas workflow versionado. |
| DEM-09 / P1 | Documentação antiga contradiz o código atual | Revisar integrations, functional-requirements e personal-integration: ainda há trechos dizendo que backend/autenticação não foram escolhidos ou que tudo está planejado. Preservar IDs RF, registrar evidências e separar observado, parcial e planejado; regenerar catálogo. |
| DEM-10 / P1 — antes de publicar | Hospedagem pública não comprovada | Validar conta e plano, aplicação Node, DNS, SSL, cookies, proxy, volume persistente, backups e restauração. Fazer teste de login, cadastro e persistência após novo deploy. Não usar somente dist para uma aplicação dependente da API. |
| DEM-11 / P1 — antes de prometer suporte nativo | Android/iOS físicos não validados | Executar matriz em aparelhos: login, retorno entre telas, arraste, vídeo, compartilhamento, teclado, tema/persistência e larguras. Registrar aparelho, versão e resultado. Teste no navegador mobile não equivale a teste nativo. |
| DEM-12 / P2 — produto a priorizar | Visão social original ainda não entregue | Refinar e priorizar feed/fotos, grupos sociais, pontos/ranking, desafios e conquistas, registro de corridas e administração/moderação. Definir MVP e critérios antes de implementar. Blocos de exercícios combinados não são grupos sociais. |

P0 indica evidência necessária antes de liberação em produção, não um incidente confirmado. As demais prioridades são uma recomendação técnica para discussão; não há responsável individual, prazo contratado ou decisão de produto presumidos.

Em especial, campos do tipo Corrida na prescrição não implementam registro de execução, GPS ou ranking de corrida. O módulo Personal cobre parte da visão de acompanhamento, mas não prova todas as funções sociais planejadas de RF-01 a RF-10. Nenhuma integração RAG paga ou serviço de IA dentro do aplicativo foi solicitada como próxima entrega.

## Histórico completo dos 36 commits

Datas extraídas do Git e apresentadas no fuso -03:00. Os links apontam ao repositório de origem; a coleta dos fatos foi feita pelo histórico local.

| Data | Commit | Entrega / história |
| --- | --- | --- |
| 21/09 | [4078ff7](https://github.com/mariomoutinho/ta-pago/commit/4078ff7) | Preparação do repositório para GitHub — HU-01. |
| 21/09 | [aaa87fe](https://github.com/mariomoutinho/ta-pago/commit/aaa87fe) | Documentação e base de conhecimento — HU-01. |
| 22/09 | [dda35b2](https://github.com/mariomoutinho/ta-pago/commit/dda35b2) | Consolidação de código e metadados — HU-01. |
| 22/09 | [719c244](https://github.com/mariomoutinho/ta-pago/commit/719c244) | Tipos Expo em checkout limpo — HU-01. |
| 23/09 | [64b1b6b](https://github.com/mariomoutinho/ta-pago/commit/64b1b6b) | Pipeline RAG e PostgreSQL — HU-02. |
| 23/09 | [a63880b](https://github.com/mariomoutinho/ta-pago/commit/a63880b) | Busca local sem API — HU-02. |
| 16/10 | [127bf16](https://github.com/mariomoutinho/ta-pago/commit/127bf16) | Acompanhamento Personal integrado — HU-03. |
| 16/10 | [9d6dba7](https://github.com/mariomoutinho/ta-pago/commit/9d6dba7) | Link e aprovação de cadastro — HU-04. |
| 16/10 | [b15279c](https://github.com/mariomoutinho/ta-pago/commit/b15279c) | Preparação de hospedagem — HU-05. |
| 20/10 | [2785f26](https://github.com/mariomoutinho/ta-pago/commit/2785f26) | Prescrição de treinos por aluno — HU-06. |
| 20/10 | [a9f3886](https://github.com/mariomoutinho/ta-pago/commit/a9f3886) | Vídeos incorporados — HU-07. |
| 21/10 | [24655e3](https://github.com/mariomoutinho/ta-pago/commit/24655e3) | Início com atalhos — HU-10. |
| 21/10 | [13b9b06](https://github.com/mariomoutinho/ta-pago/commit/13b9b06) | Lista de alunos com busca/filtros — HU-11. |
| 21/10 | [8a0b445](https://github.com/mariomoutinho/ta-pago/commit/8a0b445) | Perfil compacto — HU-11. |
| 21/10 | [3a7e00f](https://github.com/mariomoutinho/ta-pago/commit/3a7e00f) | Cartões de rotinas — HU-06. |
| 21/10 | [029f4e0](https://github.com/mariomoutinho/ta-pago/commit/029f4e0) | Cartões de treino dentro da rotina — HU-06. |
| 22/10 | [95422b0](https://github.com/mariomoutinho/ta-pago/commit/95422b0) | Feedback do aluno — HU-08. |
| 22/10 | [cd841d7](https://github.com/mariomoutinho/ta-pago/commit/cd841d7) | Janelas de treino/biblioteca, depois evoluídas para telas — HU-06. |
| 22/10 | [5d4d07c](https://github.com/mariomoutinho/ta-pago/commit/5d4d07c) | Séries editáveis e presets — HU-09. |
| 23/10 | [5eb7f1c](https://github.com/mariomoutinho/ta-pago/commit/5eb7f1c) | Correção de modal sobreposto — HU-07. |
| 23/10 | [962ffad](https://github.com/mariomoutinho/ta-pago/commit/962ffad) | Expansão na biblioteca — HU-07. |
| 23/10 | [49fdc5f](https://github.com/mariomoutinho/ta-pago/commit/49fdc5f) | Biblioteca compacta — HU-07. |
| 23/10 | [905922f](https://github.com/mariomoutinho/ta-pago/commit/905922f) | Miniatura sem expandir vídeo — HU-07. |
| 23/10 | [ff5885c](https://github.com/mariomoutinho/ta-pago/commit/ff5885c) | Permissões de miniatura e classificações — HU-07. |
| 23/10 | [d5b3584](https://github.com/mariomoutinho/ta-pago/commit/d5b3584) | Editor com arraste e ações — HU-12. |
| 24/10 | [2d2f89b](https://github.com/mariomoutinho/ta-pago/commit/2d2f89b) | Combinação e ações em lote — HU-12. |
| 24/10 | [c03c4dc](https://github.com/mariomoutinho/ta-pago/commit/c03c4dc) | Correção do editor real, membros e SPA — HU-12. |
| 24/10 | [7f150e0](https://github.com/mariomoutinho/ta-pago/commit/7f150e0) | Etapas de treino em telas — HU-06. |
| 26/10 | [9a1679b](https://github.com/mariomoutinho/ta-pago/commit/9a1679b) | Formulário somente do novo treino — HU-06. |
| 26/10 | [d3012bf](https://github.com/mariomoutinho/ta-pago/commit/d3012bf) | Prescrição compacta e sete tipos — HU-09. |
| 26/10 | [27d07f1](https://github.com/mariomoutinho/ta-pago/commit/27d07f1) | Adição direta e presets padrão — HU-09. |
| 27/10 | [fe0693c](https://github.com/mariomoutinho/ta-pago/commit/fe0693c) | Programas com treinos estruturados — HU-13. |
| 27/10 | [3e4e292](https://github.com/mariomoutinho/ta-pago/commit/3e4e292) | Prévia de modelos recolhível — HU-14. |
| 27/10 | [9861e88](https://github.com/mariomoutinho/ta-pago/commit/9861e88) | Menu mobile/Próximos cuidados removidos e sobreposição corrigida — HU-10. |
| 27/10 | [21fdf4e](https://github.com/mariomoutinho/ta-pago/commit/21fdf4e) | Indicadores removidos do início — HU-10. |
| 27/10 | [f3633e1](https://github.com/mariomoutinho/ta-pago/commit/f3633e1) | Escolha manual de tema — HU-15. |

Nas referências da tabela, HU-01 a HU-15 abreviam HU-EVO-01 a HU-EVO-15.

## Como reproduzir e atualizar o relatório

Usar Node da .nvmrc. Para a suíte de navegador, gerar Prisma e compilar a web; configurar PLAYWRIGHT_CHROMIUM_EXECUTABLE se o Chromium gerenciado não estiver instalado. Os testes criam seus próprios bancos e não requerem alterar os dados reais do aplicativo.

Comandos executados: git log/rev-list/rev-parse; knowledge:context; typecheck; personal:typecheck; personal:test; personal:build; docs:validate; docs:test; code:test; rag:test; Playwright completo. As validações documentais e dos manifestos deste relatório são executadas antes de seu commit, sem mudar a revisão-base de knowledge/config.json.

Os resultados de testes se referem ao corte f3633e1. O commit do relatório acrescenta documentação e evidências, não corrige as demandas DEM. Novas correções exigem nova execução e atualização explícita dos resultados.
