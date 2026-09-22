---
{
  "id": "ta-pago.docs.03-features.challenges",
  "title": "Desafios coletivos",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": []
}
---

# Desafios coletivos

## Estado

Planejado, não implementado. Referência: RF-06 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Criar desafios de grupo com objetivo, métrica, participantes e período.

## Fluxo proposto

Criar desafio → participar → registrar atividade elegível → acompanhar progresso → encerrar.

## Critérios de aceitação propostos

Atividade fora do período não soma; uma mesma atividade não é contada duas vezes no mesmo desafio.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Critério de ingresso tardio, cancelamento, fuso, métricas e revisão de resultados.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
