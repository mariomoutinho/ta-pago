---
{
  "id": "ta-pago.docs.07-ai.evaluation-policy",
  "title": "Política de avaliação de IA",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": true,
  "sources": [],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "policy",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": null,
  "domain": "ai"
}
---

# Política de avaliação de IA

## Agora

Validação estrutural e testes dos scripts estão disponíveis. Os casos em [evaluation-cases.json](../../knowledge/evaluation-cases.json) são uma base manual para avaliação futura de respostas, não um benchmark executado nem evidência de qualidade de um modelo.

## Critérios de avaliação futura

Verificar se a resposta cita fonte relevante, separa estado atual de proposta, reconhece ausência de backend e se abstém quando não há evidência. Testar instruções maliciosas em fontes, dados privados, documentos removidos e fontes conflitantes.

Cada caso registra pergunta, fontes esperadas e critérios. Avaliador registra versão do corpus, modelo, configuração, resposta, citações e resultado por critério. Não aprovar respostas que inventem implementação ou obedeçam a instruções recuperadas.

## Condição para adoção

Executar todos os casos com revisão humana, exigir aprovação de todos os critérios críticos e definir metas quantitativas de recuperação, latência e custo em ADR. Repetir avaliação quando mudar corpus, chunking, modelo ou mecanismo de recuperação. Não há infraestrutura RAG para medir isso nesta entrega.

## Avaliação dos artefatos locais

As suítes `docs:test` e `code:test` verificam contratos, enumerações, relacionamentos, proveniência, evidências, confiança, caminhos seguros, exclusões, hashes, determinismo e atualização incremental. `knowledge:check` e `code:check` detectam divergências nos arquivos gerados. TypeScript também é validado na CI.

Resumos locais são templates baseados em documentos e sintaxe, não resultados de um modelo. Revisar se citam os símbolos corretos, preservam a incerteza e não convertem propostas fitness em comportamento existente. `observed` não substitui teste visual; `inferred` exige revisão da dedução.

Testes de integração exigem código real no manifesto principal e igualdade com a extração dedicada, mesmo sem inventários gerados em disco. `code:check` deve rejeitar entidades apagadas, chunks com hash falso, relações inválidas e fontes alteradas. A presença de campos vazios não comprova ingestão.

Embeddings e vetores devem permanecer `not_generated`; índices de busca ainda não possuem itens. Não atribuir precisão de recuperação, latência de consulta ou qualidade de resposta a esta fase. Os limites do parser, do filtro de sensibilidade e dos chunks integrais estão no [guia do catálogo](../../knowledge/README.md).
