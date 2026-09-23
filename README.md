---
{
  "id": "ta-pago.README",
  "title": "Tá Pago",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-23",
  "language": "pt-BR",
  "tags": [
    "project"
  ],
  "indexable": true,
  "sources": [
    "LICENSE",
    "knowledge/RAG.md",
    "package.json",
    "scripts/rag/cli.mjs",
    "scripts/rag/service.mjs",
    "src/app/explore.tsx",
    "src/app/index.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "3.1.0",
  "authority": "product",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.AGENTS",
    "ta-pago.docs.00-context.glossary",
    "ta-pago.docs.00-context.personas",
    "ta-pago.docs.00-context.product-brief",
    "ta-pago.docs.01-requirements.acceptance-criteria",
    "ta-pago.docs.01-requirements.functional-requirements",
    "ta-pago.docs.01-requirements.non-functional-requirements",
    "ta-pago.docs.02-architecture.app-structure",
    "ta-pago.docs.02-architecture.data-model",
    "ta-pago.docs.02-architecture.integrations",
    "ta-pago.docs.02-architecture.navigation",
    "ta-pago.docs.02-architecture.system-overview",
    "ta-pago.docs.03-features.achievements",
    "ta-pago.docs.03-features.challenges",
    "ta-pago.docs.03-features.groups",
    "ta-pago.docs.03-features.points-and-ranking",
    "ta-pago.docs.03-features.running-records",
    "ta-pago.docs.03-features.social-feed",
    "ta-pago.docs.03-features.teacher-student-monitoring",
    "ta-pago.docs.03-features.workouts",
    "ta-pago.docs.04-development.coding-guidelines",
    "ta-pago.docs.04-development.debugging",
    "ta-pago.docs.04-development.local-setup",
    "ta-pago.docs.04-development.testing",
    "ta-pago.docs.05-decisions.ADR-0001-expo-and-expo-router",
    "ta-pago.docs.06-operations.environment-variables",
    "ta-pago.docs.06-operations.incident-response",
    "ta-pago.docs.06-operations.release-process",
    "ta-pago.docs.07-ai.agent-contract",
    "ta-pago.docs.07-ai.evaluation-policy",
    "ta-pago.docs.07-ai.rag-policy",
    "ta-pago.docs.07-ai.task-protocol",
    "ta-pago.docs.07-ai.task-template",
    "ta-pago.docs.07-ai.tool-policy"
  ],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "product"
}
---

# Tá Pago

O Tá Pago será uma rede social fitness para amigos compartilharem treinos, participarem de desafios e acompanharem sua evolução, com ferramentas para professores acompanharem alunos online.

## Estado atual

**Em desenvolvimento.** O aplicativo ainda é o template Expo: telas Home e Explore, navegação por abas, componentes tematizados e exemplos de animação. O logo está no repositório, mas não foi integrado às telas. Não há funcionalidades fitness, backend, banco, autenticação ou integrações de negócio implementadas.

O modo padrão de conhecimento é **busca local + Codex**, sem chave de API ou PostgreSQL. Execute `npm run knowledge:context -- "Como useTheme seleciona as cores?"`; o Codex usa as fontes retornadas para responder na sessão. `npm run knowledge:health` valida o catálogo local. Veja [o guia](knowledge/RAG.md).

Esta base inclui documentação, contratos para agentes e um pipeline RAG executável pelo terminal em `scripts/rag`: ingestão incremental, PostgreSQL/pgvector, recuperação híbrida, contexto e geração com fontes. O modo opcional com API requer banco e credenciais; consulte [RAG.md](knowledge/RAG.md).

## Objetivos e visão geral

Incentivar constância, interação entre amigos e acompanhamento individual. Conectar o registro de atividades ao trabalho do professor, preservando a diferença entre histórico privado e publicação social.

## Funcionalidades planejadas

- Rede social fitness: fotos de treinos e compartilhamento de atividades com amigos.
- Grupos: comunidades de participantes e atividades coletivas.
- Sistema de pontos e rankings: regras transparentes de participação e comparação por período.
- Desafios: objetivos coletivos e acompanhamento do progresso.
- Títulos e conquistas: medalhas e reconhecimento por marcos verificáveis.
- Treinos personalizados: exercícios, séries, repetições, carga, descanso e vídeos ilustrativos.
- Acompanhamento de alunos: cadastro pelo professor, vínculo autorizado, treinos concluídos e evolução.
- Registro de corridas: quilômetros e evolução ao longo do tempo; origem manual ou GPS ainda a decidir.

## Perfis de usuário planejados

| Perfil | Objetivo |
| --- | --- |
| Aluno | Treinar, registrar atividades, compartilhar progresso e participar de grupos. |
| Professor | Cadastrar alunos, prescrever treinos, criar desafios e acompanhar execução e corridas. |
| Administrador | Suporte e moderação; escopo de permissões ainda proposto. |

## Tecnologias utilizadas

Versões declaradas em [package.json](package.json): [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [React Native 0.86](https://reactnative.dev/), [React 19.2](https://react.dev/), [TypeScript 6](https://www.typescriptlang.org/), [Expo Router 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/) e [React Native Web 0.21](https://necolas.github.io/react-native-web/).

## Instalação e execução

Usar Node.js 22.13 ou superior compatível e npm. A CI documental usa Node 24.

```bash
git clone https://github.com/mariomoutinho/ta-pago.git
cd ta-pago
npm ci
npm start
```

O repositório requer acesso autorizado enquanto privado. Para web, executar `npm run web`. Android e iOS dependem de dispositivo ou simulador configurado; o simulador iOS exige macOS. Nenhum `.env` de negócio é necessário atualmente.

## Scripts disponíveis

| Script (`npm run …`) | Finalidade |
| --- | --- |
| `start` | Inicia o servidor de desenvolvimento Expo. |
| `android` / `ios` / `web` | Inicia o Expo na plataforma escolhida. |
| `reset-project` | Move ou remove `src` e `scripts` e recria a base; não usar no fluxo normal. |
| `lint` | Comando herdado `expo lint`; ESLint ainda não está configurado. |
| `typecheck` | Verifica tipos sem gerar arquivos. |
| `docs:validate` | Valida estrutura, metadados e links locais por arquivo. |
| `docs:test` | Executa testes dos scripts documentais. |
| `knowledge:build` | Gera manifesto principal consolidado e determinístico. |
| `knowledge:check` | Detecta manifesto desatualizado sem modificá-lo. |
| `knowledge:plan -- --baseline caminho.json` | Compara manifesto anterior com atual; imprime plano, sem executar ingestão. |

## Estrutura inicial

```text
src/app/           Rotas de exemplo e layout
src/components/    Interface compartilhada e variantes web
src/constants/     Tema
src/hooks/         Hooks de tema
assets/            Imagens e ícones
scripts/           Utilitários do template e da documentação
docs/              Contexto, requisitos, arquitetura, funcionalidades e políticas
knowledge/         Metadados, manifesto e avaliações futuras
.github/workflows/ Validação documental
```

## Princípios do produto

Privacidade, acessibilidade, incentivo à constância, cooperação e transparência nas regras. Preservar autonomia do aluno e acesso restrito do professor. Não tratar pontos como valor financeiro ou substituir acompanhamento profissional por respostas de IA.

## Documentação e evolução planejada

Os documentos abaixo registram o estado observado e propostas a validar. O detalhamento acompanhará as próximas implementações.

- [Glossário](./docs/00-context/glossary.md)
- [Perfis de usuário](./docs/00-context/personas.md)
- [Visão do produto](./docs/00-context/product-brief.md)
- [Critérios de aceitação](./docs/01-requirements/acceptance-criteria.md)
- [Requisitos funcionais](./docs/01-requirements/functional-requirements.md)
- [Requisitos não funcionais](./docs/01-requirements/non-functional-requirements.md)
- [Estrutura do aplicativo](./docs/02-architecture/app-structure.md)
- [Modelo conceitual de dados](./docs/02-architecture/data-model.md)
- [Integrações](./docs/02-architecture/integrations.md)
- [Navegação](./docs/02-architecture/navigation.md)
- [Visão da arquitetura](./docs/02-architecture/system-overview.md)
- [Títulos e conquistas](./docs/03-features/achievements.md)
- [Desafios coletivos](./docs/03-features/challenges.md)
- [Grupos](./docs/03-features/groups.md)
- [Pontos e rankings](./docs/03-features/points-and-ranking.md)
- [Registro de corridas](./docs/03-features/running-records.md)
- [Rede social fitness](./docs/03-features/social-feed.md)
- [Acompanhamento de alunos](./docs/03-features/teacher-student-monitoring.md)
- [Treinos personalizados](./docs/03-features/workouts.md)
- [Diretrizes de desenvolvimento](./docs/04-development/coding-guidelines.md)
- [Diagnóstico](./docs/04-development/debugging.md)
- [Ambiente local](./docs/04-development/local-setup.md)
- [Estratégia de testes](./docs/04-development/testing.md)
- [ADR-0001 — Expo e Expo Router](./docs/05-decisions/ADR-0001-expo-and-expo-router.md)
- [Variáveis de ambiente](./docs/06-operations/environment-variables.md)
- [Resposta a incidentes](./docs/06-operations/incident-response.md)
- [Processo de entrega](./docs/06-operations/release-process.md)
- [Contrato para agentes](./docs/07-ai/agent-contract.md)
- [Política de avaliação de IA](./docs/07-ai/evaluation-policy.md)
- [Política da base de conhecimento e RAG](./docs/07-ai/rag-policy.md)
- [Protocolo de tarefas](./docs/07-ai/task-protocol.md)
- [Modelo de tarefa de engenharia](./docs/07-ai/task-template.md)
- [Política de ferramentas](./docs/07-ai/tool-policy.md)

O [guia da base de conhecimento](knowledge/README.md) explica metadados, geração e atualização incremental. O [AGENTS.md](AGENTS.md) orienta agentes de código.

## Próximas etapas

Validar MVP e regras com usuários; definir identidade, autorização e persistência por ADR; desenhar jornadas; implementar funcionalidades com critérios de aceitação e testes. Configurar o RAG e avaliar respostas reais antes de integrá-lo a interfaces ou serviços do produto.

## Licença e autor

Licença [MIT](LICENSE), preservando o aviso original de copyright da Expo. Projeto mantido por [Mario Moutinho](https://github.com/mariomoutinho).

## Base de conhecimento v2

A documentação e o código têm extratores locais separados e são consolidados em `knowledge/manifest.json`. O manifesto principal contém `code_entities` e `symbol_relations` preenchidos, além de chunks com `source_type: code`; o catálogo dedicado `knowledge/code-manifest.json` usa `entities` no formato v1. Os 35 documentos receberam metadados de origem, versão, autoridade, público, sensibilidade, relacionamentos e domínio. O inventário estático identifica componentes, hooks, rotas, funções, constantes, comportamentos da interface e relações, com evidências e confiança.

Os manifestos são snapshots determinísticos da extração, sem vetores embutidos. Seus placeholders não representam o estado de um banco instalado. O RAG lê esse corpus, aplica ingestão incremental e registra a indexação no PostgreSQL; `knowledge:api:health` consulta o estado real. A CLI `knowledge:api:ask` recupera contexto e chama o LLM, preservando fontes verificadas.

| Script adicional | Finalidade |
| --- | --- |
| `code:inventory` | Gera inventário e manifesto de código locais. |
| `code:check` | Confere inventário e manifesto sem modificá-los. |
| `code:test` | Testa extração, relações, segurança e comparação incremental. |
| `knowledge:plan-code -- --baseline caminho.json` | Produz plano de diferenças do código, sem aplicá-lo. |

O extrator usa o TypeScript já instalado, sem novas dependências. A CI executa `npm ci`, verificações documentais, inventário de código e TypeScript. O [guia da base](knowledge/README.md) explica hashes, revisão-base Git, IDs, versões do extrator e chunking, resumos, limites da análise estática e atualização incremental. Essas ferramentas não modificam o comportamento do aplicativo.

## Consultas ao conhecimento

Configure o banco e os providers conforme [knowledge/RAG.md](knowledge/RAG.md). Depois execute:

```bash
npm run knowledge:migrate
npm run knowledge:api:ingest -- --dry-run
npm run knowledge:api:ingest
npm run knowledge:api:ask -- "Como Collapsible alterna o conteúdo?"
```

Os comandos `knowledge:api:search`, `knowledge:api:health` e `knowledge:evaluate` permitem depurar e avaliar a recuperação; `rag:test` executa testes isolados, sem consumir API externa. Sem configuração, os comandos reportam `REQUIRES_EXTERNAL_CONFIGURATION`.
