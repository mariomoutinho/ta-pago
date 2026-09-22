# Relatório da consolidação da ingestão de código

Relatório local, fora dos corpora indexáveis. As alterações anteriores foram preservadas; nenhum commit ou push foi feito. O manifesto principal agora agrega a extração real de src/, além dos documentos.

## Contagens

| Categoria | Quantidade |
| --- | ---: |
| component | 17 |
| hook | 3 |
| route | 2 |
| function | 11 |
| constant | 23 |
| interface-behavior | 33 |
| symbol-relation | 106 |
| Entidades sem relações | 89 |
| Chunks documentais | 30 |
| Chunks de código | 195 |
| Resumos documentais | 30 |
| Resumos de código | 195 |

## Validações

| Comando | Resultado |
| --- | --- |
| npm ci | Concluído; 22 vulnerabilidades preexistentes reportadas (14 moderadas, 8 altas). |
| npm run docs:validate | 35 documentos válidos. |
| npm run docs:test | 33 testes passaram. |
| npm run knowledge:build | Manifesto principal consolidado regenerado. |
| npm run knowledge:check | Passou. |
| npm run code:inventory | Inventário e manifesto dedicado regenerados. |
| npm run code:check | Passou. |
| npm run code:test | 20 testes passaram. |
| npm run typecheck | Passou. |
| npm run lint | Falhou: ESLint não configurado; instalação automática recusada. |
| knowledge:plan e knowledge:plan-code | Comparação consigo mesmo sem diferenças; applied: false. |
| git diff --check | Passou. |

Foram conferidos hashes dos artefatos, igualdade das coleções entre os manifestos, chunks source_type=code, relações não vazias e resumos correspondentes. Testes negativos cobrem inventários vazios/adulterados, caminhos inseguros e mudanças nas fontes. O aplicativo e package-lock.json não mudaram. As validações locais obrigatórias passaram, exceto lint sem configuração; nenhuma execução remota foi iniciada.

## Artefatos futuros e limites

Embeddings e vetores permanecem not_generated, sem valores. Índices de caminho, símbolo e domínio permanecem planned; índice lexical not_generated. Não existem embeddings reais, banco vetorial, busca semântica, reranking, recuperação de contexto por modelo ou integração operacional entre RAG e agente. A análise é estática, não teste visual; resolução de variantes é inferida, chunks são integrais e a detecção de dados sensíveis não é infalível.

## Arquivos criados nesta tarefa

- `knowledge/ingestion-report.md`
- `scripts/knowledge/catalog.mjs`

## Arquivos modificados nesta tarefa

- `AGENTS.md`
- `README.md`
- `docs/02-architecture/app-structure.md`
- `docs/02-architecture/navigation.md`
- `docs/04-development/local-setup.md`
- `docs/07-ai/evaluation-policy.md`
- `docs/07-ai/rag-policy.md`
- `knowledge/README.md`
- `knowledge/code-inventory.json`
- `knowledge/code-manifest.json`
- `knowledge/code.schema.json`
- `knowledge/manifest.json`
- `scripts/code/cli.mjs`
- `scripts/code/lib.mjs`
- `scripts/code/lib.test.mjs`
- `scripts/docs/cli.mjs`
- `scripts/docs/lib.test.mjs`
- `scripts/knowledge/common.mjs`

O workflow e os scripts npm exigidos já estavam nas alterações locais anteriores e foram preservados. A lista Git abaixo inclui também todo o trabalho anterior ainda não commitado.

## Estado completo do Git

Branch: `main`. HEAD: `aaa87fefa966c6c358fc82d3fe3deb418203baeb`. Remoto: `https://github.com/mariomoutinho/ta-pago.git`. Nenhum arquivo no staging, commit novo ou push.

```text
 M .github/workflows/documentation.yml
 M AGENTS.md
 M README.md
 M docs/00-context/glossary.md
 M docs/00-context/personas.md
 M docs/00-context/product-brief.md
 M docs/01-requirements/acceptance-criteria.md
 M docs/01-requirements/functional-requirements.md
 M docs/01-requirements/non-functional-requirements.md
 M docs/02-architecture/app-structure.md
 M docs/02-architecture/data-model.md
 M docs/02-architecture/integrations.md
 M docs/02-architecture/navigation.md
 M docs/02-architecture/system-overview.md
 M docs/03-features/achievements.md
 M docs/03-features/challenges.md
 M docs/03-features/groups.md
 M docs/03-features/points-and-ranking.md
 M docs/03-features/running-records.md
 M docs/03-features/social-feed.md
 M docs/03-features/teacher-student-monitoring.md
 M docs/03-features/workouts.md
 M docs/04-development/coding-guidelines.md
 M docs/04-development/debugging.md
 M docs/04-development/local-setup.md
 M docs/04-development/testing.md
 M docs/05-decisions/ADR-0001-expo-and-expo-router.md
 M docs/06-operations/environment-variables.md
 M docs/06-operations/incident-response.md
 M docs/06-operations/release-process.md
 M docs/07-ai/agent-contract.md
 M docs/07-ai/evaluation-policy.md
 M docs/07-ai/rag-policy.md
 M docs/07-ai/task-protocol.md
 M docs/07-ai/task-template.md
 M docs/07-ai/tool-policy.md
 M knowledge/README.md
 M knowledge/document.schema.json
 M knowledge/manifest.json
 M package.json
 M scripts/docs/cli.mjs
 M scripts/docs/lib.mjs
 M scripts/docs/lib.test.mjs
?? knowledge/code-inventory.json
?? knowledge/code-manifest.json
?? knowledge/code.schema.json
?? knowledge/config.json
?? knowledge/ingestion-report.md
?? scripts/code/cli.mjs
?? scripts/code/lib.mjs
?? scripts/code/lib.test.mjs
?? scripts/knowledge/catalog.mjs
?? scripts/knowledge/common.mjs
```
