---
{
  "id": "ta-pago.docs.03-features.groups",
  "title": "Grupos",
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

# Grupos

## Estado

Planejado, não implementado. Referência: RF-02 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Reunir amigos para compartilhar atividades e participar de desafios.

## Fluxo proposto

Criar grupo → definir ingresso → convidar participantes → consultar atividades permitidas.

## Critérios de aceitação propostos

Participante removido perde acesso ao conteúdo restrito; convite repetido não duplica participação.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Grupos públicos ou privados, papéis internos e saída do responsável.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
