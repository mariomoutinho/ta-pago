---
{
  "id": "ta-pago.README",
  "title": "Tá Pago",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "project"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "src/app/index.tsx",
    "src/app/explore.tsx",
    "LICENSE"
  ]
}
---

# Tá Pago

O Tá Pago será uma rede social fitness para amigos compartilharem treinos, participarem de desafios e acompanharem sua evolução, com ferramentas para professores acompanharem alunos online.

## Estado atual

**Em desenvolvimento.** O aplicativo ainda é o template Expo: telas Home e Explore, navegação por abas, componentes tematizados e exemplos de animação. O logo está no repositório, mas não foi integrado às telas. Não há funcionalidades fitness, backend, banco, autenticação ou integrações de negócio implementadas.

Esta base inclui documentação do produto, contratos para agentes, validação documental e manifesto local para um futuro RAG. Não há embeddings, base vetorial ou recuperação por IA em funcionamento.

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
| `knowledge:build` | Gera manifesto local determinístico. |
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

Validar MVP e regras com usuários; definir identidade, autorização e persistência por ADR; desenhar jornadas; implementar funcionalidades com critérios de aceitação e testes. Escolher infraestrutura RAG somente em tarefa futura, após avaliar necessidade e segurança.

## Licença e autor

Licença [MIT](LICENSE), preservando o aviso original de copyright da Expo. Projeto mantido por [Mario Moutinho](https://github.com/mariomoutinho).
