# Relatório operacional do RAG — 2026-09-23

## Status final

**PARTIALLY_OPERATIONAL**: PostgreSQL/pgvector reais estão funcionando, migration aplicada e infraestrutura testada. O fluxo RAG com IA real permanece **IMPLEMENTED_BUT_REQUIRES_EXTERNAL_CONFIGURATION** por uma única credencial ausente: `OPENAI_API_KEY`.

Não foi declarada operação end-to-end. Não houve embeddings ou respostas reais de LLM, nem inserção de vetores simulados no banco da aplicação. Nenhum commit/push ou alteração de configuração Git foi realizado.

## Auditoria e mudanças necessárias

A arquitetura em `scripts/rag` já estava implementada e foi preservada. Auditoria: `VectorStore`, `PgVectorStore`, providers OpenAI, `KnowledgeService`, retriever, RRF, reranker, contexto, agente e CLIs presentes. Faltavam infraestrutura/configuração de banco e chave OpenAI. O health anterior não verificava geração real, e a checagem de dimensão precisava consultar a coluna antes da ingestão: esses pontos foram corrigidos.

O Docker permanece sem integração WSL. PostgreSQL 16 já estava instalado, mas pgvector não. A solução local usa cópia privada dos binários PostgreSQL e o pacote oficial Ubuntu de pgvector, extraído sem sudo. O cluster preexistente do sistema não foi alterado. A configuração Compose existente foi preservada para outros desenvolvedores.

Também foi encontrada uma diferença de runtime: a sessão passou a usar Node 18. Foi utilizado o Node 24.19.0 já instalado, adicionado `.nvmrc` e declarado `engines.node >=22.13.0`.

## Infrastructure

| Item | Evidência real |
| --- | --- |
| PostgreSQL | 16.15, processo nativo em execução. |
| pgvector | 0.6.0, extensão consultada no banco após migration. |
| Escuta | Somente `127.0.0.1:5433`, confirmada via configuração do servidor. |
| Banco da aplicação | `ta_pago_knowledge`. |
| Banco de testes | `ta_pago_rag_test`, separado da aplicação. |
| Persistência | `.rag/postgres/data`, modo 0700. |
| Migration | `knowledge:migrate` executada com sucesso. |
| Tabelas | `knowledge_chunks` e `knowledge_index_state`. |
| Coluna vetorial | `vector(1536)`. |
| Índices | HNSW/cosseno, GIN lexical, B-tree de símbolo, caminho, filename, directory e domínio; nenhum ausente. |
| Constraints | PK `(corpus_key, chunk_id)`, dimensão 1536, tipo code/document e vetor obrigatório. |
| Credenciais | `.env` local modo 0600; Git ignora `.env` e `.rag/`. Valores não publicados. |

Helper nativo: `npm run knowledge:db -- start`, `status` e `stop`. Não há autostart após reiniciar WSL; usar `start`. Nenhum banco ou volume preexistente foi apagado.

## Embeddings e ingestão

| Campo | Resultado |
| --- | --- |
| Provider | OpenAI implementado; chave ausente. |
| Modelo configurado | `text-embedding-3-small`. |
| Dimensões | 1536, compatíveis com a coluna e constraint. |
| Chunks descobertos | 225. |
| New / updated / unchanged / deleted no dry-run | 225 / 0 / 0 / 0. |
| Embeddings reais gerados | 0. |
| Vetores reais inseridos / atualizados / removidos | 0 / 0 / 0. |
| Stored vectors | 0. |
| Missing vectors | 225. |
| Orphan vectors | 0. |
| Stale vectors | 0. |
| Erro da tentativa de ingestão | `REQUIRES_EXTERNAL_CONFIGURATION`: preencher `OPENAI_API_KEY`. |

A ingestão real foi iniciada pelo comando existente e interrompida no primeiro lote, antes de chamar a API. A transação fez rollback. Consulta direta posterior confirmou zero registros e vetores no banco da aplicação. Não se realizou segunda ingestão real como suposta prova de incrementalidade, pois a primeira ainda não pôde gerar embeddings.

Nos testes com servidor PostgreSQL real e provider **exclusivamente de teste**, foram validados: primeira carga, reexecução concorrente sem duplicar embeddings, 1 atualização/1 embedding, 1 deleção/0 embeddings, restauração da fixture, rollback e rejeição de dimensão incompatível. O schema temporário foi removido ao terminar. Esses resultados não substituem incrementalidade com OpenAI real.

## Retrieval e geração

| Componente | Estado neste ambiente |
| --- | --- |
| Semântico real | Pendente de chave e primeira ingestão; não foi silenciosamente substituído por lexical. |
| Lexical/estrutural/símbolo/caminho/domínio | Implementados; consultas SQL testadas também em PostgreSQL nativo isolado. Banco da aplicação ainda sem corpus indexado. |
| Relações, híbrido e reranking | Implementados e aprovados nos testes; operação híbrida com embeddings reais ainda não medida. |
| Context builder | Implementado e testado, com fontes, deduplicação e orçamento. |
| LLM real | Não executado; chave ausente. |
| Modelo de geração | `gpt-4.1-mini`. |
| Contexto enviado a LLM real | Nenhum. |
| Citações de LLM real | Nenhuma; não foram inventadas respostas. |

O health agora verifica embeddings e LLM reais quando há chave, e só retorna `OK` se ambos e o retrieval funcionarem. Sem chave, consulta a infraestrutura real e informa blockers. O diagnóstico atual é banco `OK`, provider/LLM `NOT_CONFIGURED`, com `OPENAI_API_KEY` e ingestão pendentes. A CLI `ask` foi ampliada para mostrar tipo da query, canais semântico/lexical/estrutural e relações junto da resposta e fontes.

## Tentativas end-to-end

Foram executados `knowledge:ask` para estas perguntas reais/tipos, mais um caso intencionalmente fora do corpus:

1. Símbolo: “Onde useTheme é utilizado?”
2. Comportamento: “Como funciona a expansão do conteúdo ao pressionar um título?”
3. Arquitetura: “Qual é a arquitetura do aplicativo e como se organizam seus componentes?”
4. Insuficiência: “Qual algoritmo de liquidação de derivativos usa o módulo QuantumSettlementService deste projeto?” — módulo propositalmente inexistente.

Em todos os casos a CLI retornou `REQUIRES_EXTERNAL_CONFIGURATION`, apontando `OPENAI_API_KEY`. Não houve execução do LLM nem avaliação real de insuficiência: essa proteção segue coberta apenas por testes automatizados enquanto falta a chave.

```text
QUESTION
Como funciona a expansão do conteúdo ao pressionar um título?

RETRIEVED SOURCES
Não executado: OPENAI_API_KEY ausente.

FINAL CONTEXT
Não enviado a modelo real.

ANSWER
REQUIRES_EXTERNAL_CONFIGURATION: configure OPENAI_API_KEY.

CITATIONS
Nenhuma resposta de LLM foi gerada.
```

## Evaluation

`knowledge:evaluate` foi tentado e informou a chave ausente. Não existem métricas novas de retrieval semântico/híbrido real.

O golden dataset de 20 perguntas continua aprovado. Na avaliação lexical/estrutural automatizada: Recall@1 **0.975**, Recall@3 **1.000**, Recall@5 **1.000**, MRR **1.000**. Essa avaliação usa banco isolado e não mede qualidade dos embeddings/LLM OpenAI. O arquivo `evaluation/local-retrieval-results.json` preserva evidência histórica da etapa anterior, com o hash do corpus correspondente àquela execução.

## Tests e validações

| Estado | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Anterior | 71 | 0 | 1 |
| Atual | **73** | **0** | **0** |

Atuais: documentos 33, inventário 20, RAG 20. O teste de servidor antes ignorado foi habilitado com `RAG_TEST_DATABASE_URL` apontando para o banco dedicado. Acrescentado teste para impedir health `OK` quando a geração falha.

Executados: `npm ci`, `npm test`, `npm run rag:test`, `npm run docs:validate`, `npm run typecheck`, `npm run knowledge:build`, `npm run knowledge:check`, `npm run code:check`, `knowledge:db -- start`, migration e consultas diretas de extensão/índices/constraints/contagens. A CI remota não foi executada, pois não houve push. As 22 vulnerabilidades pré-existentes foram mantidas; não houve audit fix nem configuração de ESLint.

Comandos operacionais registrados:

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `npm run knowledge:health` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:ingest -- --dry-run` | 0 | `DRY_RUN_OK` |
| `npm run knowledge:search -- Onde useTheme é utilizado?` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:evaluate` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:ask -- Onde useTheme é utilizado?` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:ask -- Como funciona a expansão do conteúdo ao pressionar um título?` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:ask -- Qual é a arquitetura do aplicativo e como se organizam seus componentes?` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |
| `npm run knowledge:ask -- Qual algoritmo de liquidação de derivativos usa o módulo QuantumSettlementService deste projeto?` | 2 | `REQUIRES_EXTERNAL_CONFIGURATION` |

A tentativa de `knowledge:ingest` fora de dry-run também foi executada e retornou código 2 por ausência da chave, com rollback. As operações locais autorizadas nesta etapa foram permitidas pela revisão automática; o bloqueio da etapa anterior não foi contornado.

## Arquivos alterados nesta etapa

- `.gitignore`: exclui dados/runtime em `.rag/`.
- `.nvmrc`, `package.json`, `package-lock.json`: runtime Node, helper nativo e carregamento opcional de `.env` nos testes.
- `scripts/rag/local-db.mjs`: start/stop/status do cluster nativo dedicado.
- `scripts/rag/store.mjs`: inspeção real de servidor, vetores e dimensões.
- `scripts/rag/ingest.mjs`: validação de schema antes de escrever e contadores de operações.
- `scripts/rag/config.mjs`: erros seguros e específicos de conexão/autenticação/tabela.
- `scripts/rag/health.mjs`: probes de ambos providers, blockers e distinção de índice não pronto.
- `scripts/rag/cli.mjs`: diagnóstico de chave ausente e evidências dos canais no answering.
- `scripts/rag/postgres.test.mjs`, `scripts/rag/rag.test.mjs`: regressões e incrementalidade nativa.
- `.env.example`: placeholder da variável de banco de teste já existente.
- `docs/06-operations/environment-variables.md`, `knowledge/manifest.json`: correção documental e hashes regenerados.
- `knowledge/RAG.md`, `knowledge/ingestion-report.md`: setup, custos, troubleshooting e evidências atuais.
- `.env` e `.rag/`: somente locais/ignorados; não fazem parte dos arquivos para versionamento.

As alterações preexistentes da implementação anterior foram preservadas. Nenhuma mudança em `src/`, telas ou funcionalidades fitness.

## Única ação externa pendente

**O usuário precisa preencher `OPENAI_API_KEY` em `/home/mario/ta-pago/.env` com uma chave válida, com acesso e cota para os modelos configurados.** Não é necessário fornecer senha de PostgreSQL, instalar banco ou preencher `DATABASE_URL` nesta máquina: isso já foi feito.

Depois da chave, as etapas técnicas restantes são executar ingestão real, confirmar a segunda execução sem embeddings novos, executar health/search/ask para as três perguntas e o caso de insuficiência, e medir o dataset híbrido. As operações estão implementadas e documentadas; ainda precisam ser executadas com a credencial real antes de declarar `OPERATIONAL`.

## Git

- Branch: `main`.
- HEAD: `719c2445964e65d0b03f7981ed0258e0a0e77e94`.
- Modified: 12 arquivos rastreados (inclui trabalho anterior preservado).
- Untracked: 23 arquivos (inclui trabalho anterior preservado).
- Staged: 0.
- Nenhum commit, push, mudança de remoto ou descarte de alterações.

Guia operacional completo: [RAG.md](RAG.md).
