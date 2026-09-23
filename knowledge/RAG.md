# RAG executável do Tá Pago

O aplicativo continua sendo o template Expo. A camada RAG é uma ferramenta Node de engenharia, em `scripts/rag/`, construída sobre os extratores e o manifesto existentes. Não havia backend, banco ou agente executável a reutilizar. As dependências desta ferramenta ficam em `devDependencies`; use `npm ci` completo.

O fluxo implementado é:

```text
fontes → extratores → manifest validado → registros com ID/hash/linhas
  → ingestão incremental → embeddings reais → PostgreSQL/pgvector

pergunta → análise determinística → semântica + lexical + símbolos + caminhos + domínio
  → RRF ponderado → relações limitadas → reranking determinístico
  → contexto com orçamento → KnowledgeService → LLM → resposta + fontes validadas
```

## Estado e configuração necessária

`IMPLEMENTED`: contratos de providers/storage, ingestão, migration, consultas, RRF, relações, reranking, contexto, serviço, agente CLI, testes e avaliação.

`IMPLEMENTED_BUT_REQUIRES_EXTERNAL_CONFIGURATION`: execução com banco persistente, embeddings OpenAI e LLM reais quando `DATABASE_URL` e `OPENAI_API_KEY` não estão configurados. Os comandos retornam `REQUIRES_EXTERNAL_CONFIGURATION` e código de saída 2. Testes com providers determinísticos não comprovam geração por IA real.

`NOT_IMPLEMENTED`: interface de chat no Expo, endpoint público, autenticação multiusuário e reranker externo opcional. Esses recursos não são necessários para a operação local solicitada.

O manifesto continua um snapshot determinístico de extração. Não contém vetores nem assume que algum banco esteja pronto. Seus placeholders `not_generated/planned` não são um health check. O estado operacional real fica nas tabelas e é consultado por `knowledge:health`.

## Iniciar o banco

Requisitos: Node 22.13 ou superior (Node 24.19.0 em `.nvmrc`), npm e Docker com Compose. Execute `nvm use` se estiver usando nvm; Node 18 não executa estes scripts. Em WSL, habilite a integração da distribuição no Docker Desktop. Alternativamente, use PostgreSQL com a extensão pgvector disponível.

```bash
npm ci
cp .env.example .env
```

Edite `.env`: escolha `RAG_DB_PASSWORD`, configure `DATABASE_URL` com o formato `postgresql://ta_pago:<senha-url-encoded>@127.0.0.1:5433/ta_pago_knowledge` e preencha `OPENAI_API_KEY` com uma chave de API com acesso aos modelos selecionados. A assinatura do aplicativo ChatGPT não configura essa chave automaticamente.

```bash
docker compose -f compose.rag.yaml up -d
npm run code:inventory
npm run knowledge:build
npm run knowledge:migrate
```

A porta fica vinculada somente a `127.0.0.1`. O volume `rag-data` persiste os dados. Não apague o volume para trocar dimensões sem preservar o índice necessário. Para parar sem apagar dados: `docker compose -f compose.rag.yaml stop`.

## Configuração

Variáveis são lidas somente pelos scripts Node. Não use prefixo `EXPO_PUBLIC_` para credenciais. O ambiente do processo tem precedência sobre `.env`.

| Variável | Padrão / função |
| --- | --- |
| `RAG_ENABLED` | `true`; `false` bloqueia a CLI. |
| `DATABASE_URL` | Obrigatória para operações de banco. |
| `OPENAI_API_KEY` | Obrigatória para embeddings e answering reais. |
| `RAG_EMBEDDING_PROVIDER` | `openai`; nenhum provider fake selecionável. |
| `RAG_EMBEDDING_MODEL` | `text-embedding-3-small`. |
| `RAG_EMBEDDING_DIMENSIONS` | `1536`; entre 1 e 2000 para HNSW `vector`. |
| `RAG_LLM_MODEL` | `gpt-4.1-mini`; precisa suportar Responses e JSON Schema estrito. |
| `RAG_TOP_K` | `8` resultados de busca. |
| `RAG_RERANK_TOP_K` | `30` candidatos fundidos antes de expandir relações. |
| `RAG_MIN_SCORE` | `0.15`, corte de similaridade cosseno, somente canal semântico. |
| `RAG_MAX_CHUNKS` | `8` fontes no contexto. |
| `RAG_MAX_CONTEXT_TOKENS` | `12000`, orçamento do bloco de evidências. |
| `RAG_RELATION_DEPTH` | `1`, máximo permitido 3. |
| `RAG_MAX_RELATED_CHUNKS` | `5`, máximo de novos chunks via relações. |
| `RAG_BATCH_SIZE` | `16` registros por lote de ingestão. |
| `RAG_TIMEOUT_MS` | `60000` para HTTP e consultas SQL. |
| `RAG_LOGS` | `true`; logs JSON sem conteúdo, URLs, chaves ou vetores. |

O provider divide textos longos em segmentos de até 6000 bytes (limite conservador abaixo de 8192 tokens), faz requisições de até 16 segmentos e agrega os embeddings reais por média ponderada por bytes, normalizada. Isso preserva uma identidade/vetor por chunk do catálogo; não usa vetores aleatórios. É uma escolha inicial didática, sujeita a avaliação semântica. Alteração de modelo reindexa o corpus; alteração de dimensão exige migration explícita em banco separado e nova ingestão.

## Ingestão incremental

```bash
npm run knowledge:ingest -- --dry-run
npm run knowledge:ingest
npm run knowledge:ingest
```

`--dry-run` lê o banco e informa `new`, `updated`, `unchanged`, `deleted`, `would_embed` e `would_delete`; não faz migration, não chama embeddings nem escreve estado. Requer um banco migrado para comparar o índice real.

A ingestão compara `chunk_id`, `index_hash`, modelo e dimensão. `index_hash` inclui conteúdo e metadados normalizados, inclusive linhas. Inalterados não geram embeddings. Remoções eliminam vetores órfãos. Atualizações, remoções e `knowledge_index_state` são confirmados na mesma transação, serializada por advisory lock do corpus. Se o provider falha, ocorre rollback; chamadas de API já realizadas podem ser cobradas e serão repetidas na próxima tentativa. Não há cache de lotes externos após falha.

O carregador reconstrói o manifesto a partir das fontes e exige igualdade com o arquivo versionado. Fontes alteradas exigem regeneração. IDs originais e a revisão-base Git são preservados; hashes, não o SHA futuro, descrevem alterações locais. A busca recusa índice cujo snapshot/modelo/dimensão diverge da configuração.

## Banco e interfaces

Migration: [001_rag.sql](migrations/001_rag.sql). O executor substitui `__DIMENSIONS__` apenas por inteiro validado; não execute o template SQL sem essa substituição.

| Estrutura | Uso |
| --- | --- |
| `knowledge_chunks` | Texto, vetor, IDs, hashes, modelo, dimensão, data e registro JSON com metadados/evidências. |
| `knowledge_index_state` | Snapshot e modelo confirmados por corpus (`repository:branch`). |
| `knowledge_chunks_vector` | HNSW com `vector_cosine_ops`; score `1 - distância`. |
| `knowledge_chunks_lexical` | GIN de full-text `simple` e `portuguese`. |
| Índices de símbolo, caminho, filename, directory, domínio | B-tree; consultas estruturais e filtros. |

O planner pode escolher varredura exata em corpus pequeno. A existência de HNSW não significa que toda consulta o utiliza. SQL é parametrizado; filtros de caminho escapam curingas. O índice não é serviço multiusuário: `corpus_key` separa corpus, mas não implementa autorização de pessoas.

`PgVectorStore` oferece `upsert`, `delete`, `search`, `getByChunkId`, `healthCheck`, estado e transação. `OpenAIEmbeddingProvider` oferece `embedText`, `embedBatch`, `dimensions` e `model`. `HeuristicReranker.rerank` pode ser substituído. `KnowledgeService` recebe essas dependências; agentes não manipulam SQL.

## Consultar, responder e depurar

```bash
npm run knowledge:search -- "Como Collapsible alterna o conteúdo?"
npm run knowledge:ask -- "Como Collapsible alterna o conteúdo?"
npm run knowledge:search -- "Onde useTheme é utilizado?" --top-k 8
npm run knowledge:search -- "Como funciona o tema?" --source-type code --path src/hooks/
npm run knowledge:search -- "useTheme" --symbol useTheme --domain hooks --minimum-score 0.2
npm run knowledge:search -- "useTheme" --lexical-only
```

`search` apresenta categoria, canais, RRF, expansão, ranking e fontes selecionadas, sem chamar LLM e sem imprimir embeddings. O modo `--lexical-only` desabilita apenas embeddings de consulta; ainda exige banco indexado compatível. O canal de símbolo resolve nomes conhecidos, funções, componentes, hooks, constantes, handlers e rotas. A análise favorece símbolos/caminhos explícitos, sem usar LLM. Perguntas sobre `useAuth` não passam a criar esse hook: ele não existe neste template.

RRF combina posições de rankings, não soma cosseno com full-text. Relações existentes são percorridas nos dois sentidos, com visitas controladas e limites de profundidade/quantidade; filtros também valem para os vizinhos. O reranker usa fusão, cobertura lexical, correspondência de símbolo/caminho e penalização de chunks derivados redundantes.

O contexto deduplica conteúdo e sobreposição de evidências, mantendo variantes web/nativa separadas. Inclui caminhos, linhas, símbolo, ID, autoridade, estado e confiança; relações entre fontes selecionadas entram se houver orçamento. O orçamento usa bytes UTF-8 como limite superior conservador de tokens, incluindo cabeçalhos e marcadores. É deliberadamente mais restritivo que uma estimativa de caracteres/4. O limite não inclui a pergunta, instruções e saída; estes têm limites próprios. Trechos truncados são marcados.

`ask` usa `createKnowledgeAgent(service).answer`, que chama `KnowledgeService.answerWithKnowledge`: recuperação obrigatória, contexto e OpenAI Responses com `store:false`. O agente também expõe `search_knowledge` como tool reutilizável. Não havia agente anterior, nem foi adicionado framework de agentes. A CLI é o ponto executável da integração.

O modelo recebe evidências como dados, com instruções para não seguir comandos nelas. Retorna afirmações com IDs de fonte. O serviço rejeita IDs inexistentes e afirmações sem fontes (exceto declaração explícita de insuficiência); caminhos e linhas são obtidos dos metadados. Verificar IDs não prova que cada afirmação decorra semanticamente da fonte: a avaliação humana ainda importa.

## Health e avaliação

```bash
npm run knowledge:health
npm run knowledge:evaluate
npm run knowledge:evaluate -- --lexical-only
```

Health verifica manifesto, contagem de chunks, conectividade, extensão, tabela, dimensão, sete índices, vetores presentes/ausentes/órfãos/desatualizados e consultas de recuperação. Com chave configurada, verifica embeddings e geração via chamadas reais, inclusive antes da primeira ingestão. Com índice pronto, também executa recuperação híbrida. Essas chamadas podem gerar custo. `OK` exige sucesso de ambos os providers e do retrieval; sem chave, a infraestrutura continua sendo inspecionada e o blocker exato é informado. Antes da primeira ingestão, `INDEX_NOT_READY`/vetores ausentes são esperados e não impedem executar a ingestão após configurar a chave.

O dataset [questions.json](evaluation/questions.json) contém 20 perguntas sobre código/docs reais. Recall@1/3/5 é a fração de arquivos esperados recuperados entre os primeiros arquivos únicos; média macro por pergunta. MRR usa a posição do primeiro arquivo relevante. Símbolos também são verificados no dataset e reportados em métrica separada. Avaliação não chama LLM, mas no modo híbrido gera embeddings de consulta. Métricas lexicais não medem qualidade semântica ou qualidade da resposta.

## Testes

```bash
npm test
npm run rag:test
npm run typecheck
npm run docs:validate
npm run knowledge:check
npm run code:check
```

Os testes SQL locais usam PostgreSQL/pgvector compilados em WASM (PGlite), sem serviço externo. Providers determinísticos e respostas fixture existem apenas em `scripts/rag/testing` e testes, nunca como alternativa de produção. Cobrem incrementalidade, rollback, segurança, consultas, ranking, contexto e transporte/validação do answering. Não são uma demonstração com LLM real.

Para testar também o driver `pg`, concorrência e servidor nativo, forneça `RAG_TEST_DATABASE_URL` apontando para banco dedicado terminado em `_test`. O teste cria um schema temporário e remove apenas esse schema. A CI configura esse banco via serviço pgvector. Sem essa variável, o teste de servidor é skipped; os demais permanecem executáveis.

## Segurança e limites

Só entram README/docs elegíveis e fontes TS/TSX do aplicativo já aprovadas pelos extratores. `.env`, credenciais, chaves privadas, dependências, build, Git, fixtures e arquivos gerados são excluídos. Links simbólicos são recusados. Sensibilidade diferente de public/internal é bloqueada; padrões de segredos e dados pessoais causam falha antes de enviar texto. A detecção é heurística e não substitui revisão. Consultas também passam pela checagem de segredos.

Não há API pública, execução de comandos pelo agente nem alteração na interface do aplicativo. Não se instalaram Redis, Elasticsearch, Neo4j ou frameworks RAG. Chamadas HTTP têm timeout e retentativa limitada para 429/5xx. Erros externos brutos são omitidos para evitar vazamento de credenciais. Não há garantia automática de disponibilidade, custo, entailment ou resistência perfeita a prompt injection.

Referências da implementação: [embeddings OpenAI](https://developers.openai.com/api/docs/guides/embeddings), [saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs), [pgvector](https://github.com/pgvector/pgvector), [transações node-postgres](https://node-postgres.com/features/transactions) e [extensões PGlite](https://pglite.dev/extensions/).

## Ambiente local preparado em 2026-09-23

Nesta máquina, o PostgreSQL 16.15 foi iniciado nativamente porque a integração Docker/WSL não estava disponível. O pgvector 0.6.0 foi extraído do pacote oficial Ubuntu `postgresql-16-pgvector` em um runtime privado, sem instalar pacotes como root nem alterar o cluster do sistema.

- Host/porta: `127.0.0.1:5433`, sem escuta pública.
- Banco da aplicação: `ta_pago_knowledge`.
- Banco isolado de testes: `ta_pago_rag_test`.
- Dados persistentes: `.rag/postgres/data`.
- Runtime: `.rag/postgres/runtime/usr/lib/postgresql/16/bin`.
- Credenciais locais: `.env` com modo 0600, ignorado pelo Git.
- Senha do banco: gerada aleatoriamente e efetivamente configurada no PostgreSQL; não é chave de API.

```bash
nvm use
npm run knowledge:db -- status
npm run knowledge:db -- start
# Para interromper sem apagar dados:
npm run knowledge:db -- stop
```

O helper só administra esse cluster nativo dedicado; não remove bancos ou volumes. `start` preserva clusters existentes e cria apenas os bancos dedicados ausentes. Não execute Compose na mesma porta enquanto o cluster nativo estiver ativo. A instalação não configura inicialização automática do sistema: após reiniciar o WSL, execute `knowledge:db -- start`.

Neste ambiente, `DATABASE_URL` já está configurada e a migration está aplicada. A ação externa pendente é preencher `OPENAI_API_KEY` no `.env` local com uma chave válida que tenha acesso aos modelos e cota de API. Não cole a chave no chat ou nos documentos.

Depois de fornecer a chave:

```bash
nvm use
npm run knowledge:db -- start
npm run knowledge:ingest -- --dry-run
npm run knowledge:ingest
npm run knowledge:ingest
npm run knowledge:health
npm run knowledge:search -- "Onde useTheme é utilizado?"
npm run knowledge:ask -- "Como Collapsible alterna o conteúdo?"
npm run knowledge:evaluate
```

A segunda ingestão deve informar `embedded: 0` se nenhuma fonte/configuração mudou. Somente após ingestão real, health aprovado e respostas reais com fontes o sistema pode ser classificado como `OPERATIONAL`.

## Reprodução alternativa em Linux/WSL sem sudo

Compose continua sendo o setup recomendado e já existe em `compose.rag.yaml`. O helper nativo é uma alternativa para Ubuntu com PostgreSQL 16 já instalado. Nesta máquina, foram copiados `/usr/lib/postgresql/16` e `/usr/share/postgresql/16` para os mesmos caminhos relativos sob `.rag/postgres/runtime/`; depois foi executado `apt-get download postgresql-16-pgvector` em `.rag/postgres/downloads` e `dpkg-deb -x` sobre o pacote, tendo o runtime como destino. O gerenciador APT obtém o pacote e verifica seu hash com os metadados do repositório. Não houve instalação global ou escrita nos diretórios do sistema.

Os comandos de cópia/download só preparam binários; `knowledge:db -- start` inicializa os dados separados, exige senha e usa SCRAM-SHA-256. Para uma máquina sem PostgreSQL 16 pré-instalado, use Compose em vez de copiar um runtime incompatível. Não reutilize diretórios de dados de outra versão principal do PostgreSQL.

## Custos de API

Ingestão chama a API de embeddings apenas para registros novos/alterados ou modelo alterado; retentativas após rollback podem repetir chamadas já cobradas. `knowledge:search` não chama o LLM, mas gera embedding de consulta no modo padrão. `knowledge:ask` chama embeddings e o modelo de geração. `knowledge:evaluate` gera embeddings para as 20 perguntas no modo híbrido. O health com chave configurada também testa os dois modelos e, quando possível, retrieval. Não há estimativa monetária fixa; consulte o faturamento/preços do provider antes de ampliar o volume.

## Troubleshooting

| Sintoma | Diagnóstico / ação |
| --- | --- |
| `DATABASE_URL` ausente | Preencher a URL local em `.env`; não enviá-la para logs. |
| `OPENAI_API_KEY` ausente | Fornecer a chave no `.env`; não há fallback para embeddings/respostas simulados. |
| `DATABASE_UNAVAILABLE` | Iniciar o banco com Compose ou `knowledge:db -- start`; conferir host/porta. |
| `DATABASE_AUTHENTICATION_FAILED` | Conferir a senha local e a URL; não recriar dados para resolver autenticação. |
| pgvector ausente | Usar a imagem pgvector ou instalar a extensão compatível com PostgreSQL; depois executar a migration. |
| `DIMENSION_MISMATCH` | Alinhar modelo/dimensão com a coluna existente; a ingestão falha antes de escrever. Para outra dimensão, preparar banco separado. |
| `MIGRATION_REQUIRED` / tabela ausente | Executar `knowledge:migrate` no banco correto; operação idempotente. |
| `PROVIDER_ERROR` em embeddings | Conferir acesso ao modelo, chave, limite/cota e status HTTP sanitizado. |
| `PROVIDER_ERROR` / `INVALID_ANSWER` no LLM | Conferir acesso ao modelo e suporte a Responses/JSON Schema estrito; não publicar respostas inválidas. |
| `INDEX_NOT_READY` | Ingerir o corpus após configurar provider; atualizar manifesto se as fontes mudaram. |
| Erro em `import.meta.dirname` com Node 18 | Executar `nvm use` (24.19.0) antes dos comandos. |

Os testes leem `.env` opcionalmente para `RAG_TEST_DATABASE_URL`. O banco de teste deve terminar em `_test`, usa apenas providers de teste e recebe schema temporário próprio. O banco da aplicação nunca recebe vetores fixture. O health só testa APIs reais se a chave estiver configurada.
