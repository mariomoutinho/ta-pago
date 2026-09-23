# Base de conhecimento do Tá Pago

A base tem extratores independentes para documentos e código, um inventário de código próprio e um manifesto principal consolidado. Documentos e entidades continuam em coleções distintas, com chunks e resumos determinísticos. O pipeline de execução em `scripts/rag` consome esses artefatos para ingestão incremental e answering. Consulte [RAG.md](RAG.md) para PostgreSQL/pgvector, providers, comandos, testes e limites. A execução real exige configuração externa.

## Arquivos e fronteiras

| Arquivo | Responsabilidade |
| --- | --- |
| [document.schema.json](document.schema.json) | Contrato dos metadados documentais. |
| [manifest.json](manifest.json) | Manifesto principal v2 (`catalog: knowledge`), com documentos, entidades reais de código, relações, chunks documentais/de código e resumos. `code_artifacts` registra caminhos e hashes dos artefatos de código. |
| [code.schema.json](code.schema.json) | Contrato de cada entidade e relação de código. |
| [code-inventory.json](code-inventory.json) | Arquivos analisados, entidades, relações, layouts e exclusões; `counts` contém quantidades por tipo e `groups` agrupa IDs que apontam às entidades completas. |
| [code-manifest.json](code-manifest.json) | Catálogo de código v1 (`code-knowledge-v1`), com `entities`, `symbol_relations`, chunks e resumos reais; sem documentos Markdown. |
| [config.json](config.json) | Repositório, branch e commit reais usados como âncora de origem. |
| [evaluation-cases.json](evaluation-cases.json) | Casos de avaliação manual futura de respostas. |

Documentos elegíveis são `README.md`, `AGENTS.md` e `docs/**/*.md`, filtrados por `indexable` e estado. `AGENTS.md` e contratos de execução permanecem não indexáveis e não representam comportamento do aplicativo. `knowledge/` não entra recursivamente no corpus documental.

O extrator de código lê apenas `src/**/*.ts` e `src/**/*.tsx`. Não executa o código. Exclui arquivos de declaração, testes/fixtures, gerados, caminhos ocultos, dependências, imagens, assets, logs, caches e arquivos de ambiente. Referências textuais a imagens e imports podem aparecer em evidências; os arquivos binários e módulos externos não são ingeridos. Uma referência documental em `sources` não autoriza ingerir o arquivo de código: os dois fluxos têm escopos próprios.

## Metadados dos documentos

Preserva-se JSON entre delimitadores `---`, com H1 correspondente a `title`. Não há parser YAML genérico. O schema e o validador devem evoluir juntos; o validador implementa somente o subconjunto usado pelos contratos locais.

| Campo | Regra |
| --- | --- |
| `id` / `title` | ID estável `ta-pago.…` e título original; preservar ao mover um documento. |
| `status` | `current`, `proposed` ou `deprecated`; estado do documento, não prova de implementação. |
| `owner` / `updated_at` | Responsável e data real da revisão; data não futura. |
| `language` / `tags` | `pt-BR` e assuntos sem duplicatas. |
| `indexable` / `sources` | Elegibilidade e arquivos locais de evidência; documento obsoleto não é indexável. |
| `repository` / `branch` | Origem completa `mariomoutinho/ta-pago` e branch de origem, conforme configuração. |
| `commit_sha` | SHA real da revisão-base em `config.json`; `null` somente quando a origem não for conhecida. |
| `version` | Versão explícita dos metadados/conteúdo, `2.0.0` na base anterior e `3.0.0` nos documentos revisados para RAG. |
| `authority` | `code`, `requirement`, `architecture`, `decision`, `policy`, `proposal`, `external` ou `product`. |
| `audience` | Lista sem duplicatas de `developer`, `ai_agent`, `teacher`, `student`, `product`, `operations`, `reviewer`. |
| `sensitivity` | `public`, `internal`, `confidential` ou `restricted`; corpus atual interno. |
| `supersedes` / `related_documents` | IDs existentes, sem duplicatas ou autorreferência. Não há substituições inventadas; relações vêm de links documentais existentes. |
| `framework_version` | Versões relevantes em texto; `null` quando não se aplica. |
| `domain` | Um domínio da enumeração do schema, como `product`, `routing`, `ui`, `hooks`, `rag`, `testing`, `workouts`. |

ADRs usam `decision`; requisitos, `requirement`; funcionalidades futuras, `proposal`; contratos operacionais, `policy`. Código observado recebe `code` ou `architecture` conforme a finalidade do documento.

## Proveniência e hashes

`commit_sha` identifica a revisão real usada como **base da extração/revisão**, não afirma que as alterações locais já estejam commitadas. Os hashes descrevem o conteúdo efetivamente lido no diretório de trabalho. Isso evita o ciclo impossível de um manifesto conter o SHA do commit que o contém.

A origem fica fixada explicitamente em `config.json`. Os documentos devem concordar com ela. Quando Git está acessível, o validador confere `origin`, a existência do commit, sua ancestralidade em HEAD e na branch de origem disponível. Um checkout destacado em CI pode validar a origem `main`; ele não é confundido com uma nova branch de origem. Sem Git, só é possível validar a consistência declarada; não se fabrica um SHA. CI usa histórico completo. Alterar a âncora é uma revisão explícita, não ocorre automaticamente ao avançar HEAD.

Documentos e arquivos de código usam SHA-256 do texto UTF-8 completo. Entidades e chunks usam SHA-256 de JSON canônico sem o próprio campo `sha256`. A ordem das chaves não afeta o hash canônico; listas, evidências, metadados, relações e conteúdo afetam. Não existem horários de geração ou IDs aleatórios. Mudança em qualquer trecho de um arquivo de código invalida também `source_sha256` das suas entidades: é uma política conservadora.

## Extração estática de código

`typescript-ast-v2` usa o parser e resolução de escopo local do TypeScript já declarado no projeto. O host do analisador lê somente os arquivos permitidos; não carrega tipos ou implementações de `node_modules` nem executa imports.

Reconhece funções e arrow functions, callbacks de UI/efeitos, componentes funcionais, hooks exportados e reexportação nominal de hook. Registra linhas `start_line`/`end_line`, constantes de módulo com `value_type` (tipo declarado ou categoria sintática do inicializador), props com assinatura, bindings/defaults e aliases/interfaces locais, chamadas, filhos JSX, eventos, retornos explicitamente anotados, temas e variantes. Tipos de retorno sem anotação ficam `null`: não são inventados. Contratos de props importados ficam como referência textual; não são expandidos a partir de bibliotecas externas.

IDs de símbolos combinam caminho, tipo e nome qualificado. Callbacks anônimos usam o pai, o evento ou a chamada e ordinal local quando repetidos. Renomear um símbolo ou movê-lo gera remoção e adição; inserir outro callback anônimo com o mesmo contexto pode deslocar ordinais. Um layout é um componente com `route.kind: layout`, nunca uma rota navegável. Rotas de página exigem exportação default identificada e são derivadas do caminho Expo Router.

Relações referenciam IDs existentes, com origem, destino, tipo e evidência. Incluem renderização, consumo de hooks/constantes, chamadas, links, handlers de eventos e variantes web; a variante tem evidência nos dois arquivos e confiança `inferred`. Imports relativos e o alias `@/` são resolvidos dentro de `src`; escopos locais evitam confundir parâmetros com constantes homônimas. Módulos externos, barrels complexos, factories, componentes de classe, namespaces e resolução completa de plataformas não são interpretados como se houvesse certeza. Uma resolução compartilhada com variante web é `inferred`; a seleção real do bundler requer validação de plataforma.

`observed` significa sintaxe diretamente encontrada, não teste visual executado. `inferred` marca convenções como inclusão pelo layout e resolução dependente de plataforma. `unknown` marca destinos dinâmicos ou efeitos não demonstráveis. `return null` não vira promessa de interface visível. São inventariados apenas comportamentos do template atual, não funcionalidades fitness.

## Chunks e resumos

A estratégia inicial `atomic-source-v1` gera um chunk por documento indexável ou entidade/relação. Mantém documento integral, incluindo tabelas e critérios; componente com assinatura e props; função com assinatura; relação com os dois símbolos. Não há limite rígido de tokens, truncamento nem overlap. Chunks grandes são uma limitação deliberada desta preparação e serão revistos antes de embeddings reais.

Cada chunk registra nome, tipo da entidade, `id`, `source_id`, `source_type` (`document`/`code`), `source_path`, `section`, `content`, `token_estimate`, `semantic_summary`, `metadata` e `sha256`. O ID tem sufixo estável `::chunk:whole`; em código, `section` identifica o símbolo e `metadata.entity_type` informa sua categoria. `token_estimate` é uma estimativa de caracteres/4, não contagem de um tokenizer de modelo.

O resumo determinístico registra representação, responsabilidade, símbolos ou documentos relacionados, estado, evidências e confiança. Usa campos e padrões observados, sem modelo. `semantic_summaries` oferece os mesmos resumos referenciados por chunk; o nome não significa interpretação por IA nem busca semântica disponível.

## Embeddings, vetores e índices

O manifesto principal v2 tem `documents`, `code_entities`, `chunks`, `embeddings`, `vectors`, `indexes`, `semantic_summaries` e `symbol_relations`. As coleções de código são preenchidas com a extração real de `src/`. O manifesto dedicado usa schema v1 com `entities` e as seções correspondentes de código. Nenhum deles contém dados fictícios para preencher listas.

- `embeddings`: `status: not_generated`, `model: null`, `items: []`.
- `vectors`: `status: not_generated`, `store: null`, `items: []`.
- `path-index`, `symbol-index` e `domain-index`: `status: planned`, sem itens.
- `lexical-index`: `status: not_generated`, sem itens.

Esses estados pertencem ao snapshot de extração. Os extratores continuam sem rede; não representam o estado operacional do RAG. `knowledge:ingest` persiste vetores e o estado real no PostgreSQL, e `knowledge:health` consulta vetores, índices e recuperação. Não se altera o manifesto para simular sucesso de uma ingestão.

## Operação e atualização incremental

```bash
npm ci
npm run docs:validate
npm run docs:test
npm run knowledge:build
npm run knowledge:check
npm run code:inventory
npm run code:check
npm run code:test
npm run typecheck
```

Editar fontes e revisar metadados antes de regenerar; nunca corrigir hashes manualmente. `knowledge:build` extrai documentos e código diretamente das fontes e escreve o manifesto principal consolidado; não depende de arrays previamente gerados. `code:inventory` escreve o inventário e manifesto dedicado de código. Executar ambos após alterações nas fontes mantém as três saídas consistentes. As verificações apenas comparam o conteúdo calculado com o versionado. Instruções explícitas de não fazer commit/push prevalecem sobre o fluxo Git padrão.

Guardar cada manifesto anterior fora do corpus antes da atualização: principal v2 e dedicado de código v1. Comparar com:

```bash
npm run --silent knowledge:plan -- --baseline /tmp/ta-pago-docs-before.json
npm run --silent knowledge:plan-code -- --baseline /tmp/ta-pago-code-before.json
```

O plano principal tem `applied: false` e grupos independentes `documents`, `code_entities`, `chunks` e `symbol_relations`, cada um com `added`, `updated`, `removed`, `unchanged`. Compara IDs e representação canônica completa: nomes, tipos, caminhos, hashes, metadados, conteúdo e relações. Mudança do extrator invalida todas as unidades existentes; mudança de chunking invalida todos os chunks. Configurações incompatíveis de catálogo, origem ou versão falham explicitamente.

O plano de código tem `schema_version: 1`, `applied: false` e `added`, `updated`, `removed`, `unchanged` no nível superior para entidades; grupos `code_entities`, `chunks` e `symbol_relations` preservam o detalhamento. Aceita o catálogo dedicado v1 e explicitamente o formato local anterior de código v2.

Para primeira carga, usar baseline com o mesmo cabeçalho/versões e coleções vazias. O catálogo principal agora usa `catalog: knowledge`; para migrar o antigo catálogo `documents`, reconstruir/revisar o snapshot ou iniciar baseline consolidado novo. Não reinterpretar o antigo manifesto documental v1 como código. O consumidor `scripts/rag/ingest.mjs` processa novos/alterados, remove órfãos e confirma o estado na mesma transação; a reexecução preserva chunks inalterados. Os comandos de planejamento dos extratores continuam sem aplicar mudanças.

## Segurança, CI e limites

Links simbólicos, inclusive quebrados e em diretórios, são rejeitados. Possíveis credenciais, padrões de tokens, e-mail, CPF e telefone internacional excluem o arquivo de código inteiro. Para constantes com nomes sensíveis, o relatório preserva apenas nome e localização; valor, declaração e hash do conteúdo sensível são omitidos. Não há garantia de identificar todo dado pessoal ou segredo arbitrário: revisar fontes e diff continua obrigatório. Não adicionar dados reais de alunos para completar o inventário.

A CI instala dependências pelo lockfile, valida documentos, código e TypeScript e executa testes de RAG com PostgreSQL/pgvector isolado e providers determinísticos exclusivos de teste. Não chama APIs reais de IA, configura ESLint nem faz deploy, commit ou push. O comando herdado `expo lint` continua sem configuração completa. Links locais são checados por arquivo; URLs externas, âncoras, veracidade semântica e comportamento em dispositivo precisam de revisão/testes específicos.
