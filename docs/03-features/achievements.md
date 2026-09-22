---
{
  "id": "ta-pago.docs.03-features.achievements",
  "title": "Títulos e conquistas",
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

# Títulos e conquistas

## Estado

Planejado, não implementado. Referência: RF-07 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Conceder títulos e medalhas conforme critérios verificáveis de participação e evolução.

## Fluxo proposto

Avaliar evento → verificar critério versionado → conceder conquista → exibir no perfil autorizado.

## Critérios de aceitação propostos

A mesma conquista não é concedida duas vezes pelo mesmo marco; critério fica acessível ao participante.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Catálogo, recorrência, revogação e efeito de atividades excluídas.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
