---
{
  "id": "ta-pago.docs.03-features.teacher-student-monitoring",
  "title": "Acompanhamento de alunos",
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

# Acompanhamento de alunos

## Estado

Planejado, não implementado. Referência: RF-08 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

Permitir ao professor cadastrar alunos e acompanhar treinos concluídos, corridas, desafios e evolução.

## Fluxo proposto

Convidar ou cadastrar aluno → confirmar vínculo → consultar histórico permitido → ajustar acompanhamento.

## Critérios de aceitação propostos

Professor sem vínculo ativo não acessa dados; encerrar vínculo revoga acesso futuro sem apagar o histórico do aluno.

Erros devem ser apresentados sem perder dados já preenchidos. Acesso deve respeitar as permissões do usuário, inclusive ao consultar registros diretamente.

## Dados e dependências

Depende de identidade e autorização futuras e do [modelo conceitual](../02-architecture/data-model.md). Persistência e serviços ainda não foram definidos.

## Questões em aberto

Consentimento, múltiplos professores, indicadores de evolução e retenção após desligamento.

## Validação futura

Cobrir fluxo principal, entrada inválida, acesso indevido e repetição de operação. Estes cenários são requisitos de testes futuros, não evidência de testes existentes.
