---
{
  "id": "ta-pago.docs.03-features.workouts",
  "title": "Treinos personalizados",
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

# Treinos personalizados

## Estado

Planejado, não implementado. Referência: RF-04 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Permitir ao professor organizar exercícios por aluno com séries, repetições, carga, descanso e vídeo ilustrativo.

## Fluxo proposto

Selecionar aluno vinculado → criar prescrição → organizar exercícios → publicar versão → aluno registrar execução.

## Critérios de aceitação propostos

Execução preserva a versão prescrita; valores inválidos são rejeitados; ausência de vídeo não impede leitura do exercício.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Unidades de carga, exercícios por tempo, edição de prescrições e origem dos vídeos.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
