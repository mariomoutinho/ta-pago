---
{
  "id": "ta-pago.docs.07-ai.evaluation-policy",
  "title": "Política de avaliação de IA",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": true,
  "sources": []
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
