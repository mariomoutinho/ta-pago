# Catálogo documental do Tá Pago

Esta pasta prepara a base para RAG futuro. Não há embeddings, base vetorial, indexador, recuperação ou chamadas externas. O manifesto é um inventário local, não prova de ingestão.

## Arquivos

- [document.schema.json](document.schema.json): contrato de metadados.
- [manifest.json](manifest.json): catálogo gerado, com metadados, caminho e SHA-256 de cada documento elegível.
- [evaluation-cases.json](evaluation-cases.json): casos de avaliação manual futura de respostas.
- [Política RAG](../docs/07-ai/rag-policy.md): confiança, fontes, exclusões e processamento futuro.

## Corpus e metadados

O validador lê somente `README.md`, `AGENTS.md` e arquivos `.md` sob `docs/`. Outros arquivos não são candidatos automáticos. A própria pasta `knowledge/` fica fora do corpus para evitar indexar o manifesto recursivamente.

Cada documento começa com `---`, um objeto JSON e outro `---`. JSON é usado como subconjunto explícito de YAML, dispensando dependências de parsing; YAML livre não é aceito. O título H1 deve coincidir com `title`.

| Campo | Contrato |
| --- | --- |
| `id` | Identificador único iniciado por `ta-pago.`; preservar ao renomear o arquivo. |
| `title` | Título não vazio. |
| `status` | `current`: descreve estado ou política vigente; `proposed`: proposta; `deprecated`: obsoleto. Não equivale a estado de implementação de uma funcionalidade. |
| `owner` | Responsável pela revisão. |
| `updated_at` | Data real da última revisão, ISO `YYYY-MM-DD`, sem data futura. |
| `language` | `pt-BR`. |
| `tags` | Lista não vazia de assuntos, sem duplicatas. |
| `indexable` | Booleano de elegibilidade; `deprecated` exige `false`. |
| `sources` | Caminhos de arquivos locais que sustentam afirmações observadas; lista vazia para propostas sem evidência no código. |

O JSON Schema é o contrato. O validador implementa as restrições usadas neste schema, não é um motor genérico de JSON Schema. Mudanças no contrato exigem atualizar validador, testes e versão quando houver incompatibilidade. `sources` não importa nem indexa esses arquivos e não prova que uma afirmação é correta.

## Atualização normal

1. Editar o documento de origem e revisar estado, fontes, privacidade e `updated_at`.
2. Executar `npm run docs:validate` e `npm run docs:test`.
3. Executar `npm run knowledge:build`.
4. Revisar diferenças em conteúdo, metadados e manifesto.
5. Executar `npm run knowledge:check` e incluir documentação e manifesto no mesmo commit.

O manifesto é determinístico: arquivos ordenados, hash do texto completo em UTF-8 e ausência de timestamp de geração. Mudanças de conteúdo ou metadados alteram o hash. Alterações em arquivos referenciados por `sources` exigem revisão humana do documento; não se infere atualização semântica pelo código automaticamente.

## Plano incremental

Usar como baseline o último manifesto **confirmado como aplicado** pelo consumidor futuro. Enquanto não há consumidor, pode-se comparar com um manifesto de outro commit apenas para revisão:

```bash
git show <commit-anterior>:knowledge/manifest.json > /tmp/ta-pago-baseline.json
npm run knowledge:plan -- --baseline /tmp/ta-pago-baseline.json
```

Para primeira carga, usar um arquivo baseline com `{"schema_version":1,"documents":[]}`. Para capturar apenas JSON, usar `npm run --silent knowledge:plan -- --baseline /tmp/ta-pago-baseline.json > /tmp/ta-pago-plan.json`.

| Resultado | Ação do consumidor futuro |
| --- | --- |
| `added` | Criar chunks do novo documento. |
| `updated` | Substituir todos os chunks antigos do ID; inclui mudanças de caminho. |
| `removed` | Remover todos os chunks e caches do ID; inclui exclusão, `indexable: false` e depreciação. |
| `unchanged` | Não processar novamente. |

O plano tem `applied: false` e não escreve nem executa operações externas. Um consumidor futuro deverá processar operações de forma idempotente, persistir sucesso somente após confirmação integral e manter baseline anterior para retentar falhas. Nunca avançar baseline apenas por gerar um plano. Trocar modelo ou regras de chunking exigirá reindexação completa, mesmo com hashes iguais.

## CI e limites

O workflow `documentation.yml` executa validações e testes e rejeita manifesto desatualizado; não faz commits, push ou ingestão. Links locais são verificados por existência do caminho (inline e definições de referência); âncoras, URLs remotas e semântica das afirmações precisam de revisão humana. Não há detector infalível de segredos: revisar o diff antes de publicar.
