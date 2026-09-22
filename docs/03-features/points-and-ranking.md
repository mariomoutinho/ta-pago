---
{
  "id": "ta-pago.docs.03-features.points-and-ranking",
  "title": "Pontos e rankings",
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

# Pontos e rankings

## Estado

Planejado, não implementado. Referência: RF-03 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Reconhecer participação com pontos e ordenar resultados em um período e grupo.

## Fluxo proposto

Receber evento elegível → aplicar regra versionada → registrar crédito → recalcular posição.

## Critérios de aceitação propostos

Reprocessar a mesma conclusão não concede pontos novamente; empates seguem regra explícita.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Valores, limites diários, desempate, antifraude e estorno.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
