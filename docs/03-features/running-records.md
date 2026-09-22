---
{
  "id": "ta-pago.docs.03-features.running-records",
  "title": "Registro de corridas",
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

# Registro de corridas

## Estado

Planejado, não implementado. Referência: RF-05 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Registrar quilômetros corridos e acompanhar totais por período.

## Fluxo proposto

Informar data e distância → validar → salvar registro → consultar evolução.

## Critérios de aceitação propostos

Distância deve ser finita e maior que zero; correção de registro atualiza totais sem duplicação.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Entrada manual versus GPS, duração, fuso horário e comprovação. Não existe integração GPS.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
