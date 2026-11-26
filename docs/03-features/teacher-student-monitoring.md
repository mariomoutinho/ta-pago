---
{
  "id": "ta-pago.docs.03-features.teacher-student-monitoring",
  "title": "Acompanhamento de alunos",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": [
    "src/components/personal/profile.tsx",
    "server/app.ts",
    "src/components/personal/forms.tsx",
    "src/features/personal/student-fields.ts",
    "shared/validation.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.1.0",
  "authority": "proposal",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.01-requirements.functional-requirements",
    "ta-pago.docs.02-architecture.data-model"
  ],
  "framework_version": null,
  "domain": "teacher-student"
}
---

# Acompanhamento de alunos

## Estado

Implementação parcial no [módulo Personal](personal-integration.md): cadastro, vínculos, programas em texto, avaliações e registros manuais. Prescrição estruturada com vídeos, GPS e recursos sociais descritos abaixo permanecem planejados. Referência: RF-08 nos [requisitos funcionais](../01-requirements/functional-requirements.md).

## Objetivo

O cadastro manual inicial apresenta somente a seção Dados pessoais, além de status e programa vigente. As seções Acompanhamento e Saúde e segurança ficam disponíveis na edição do aluno. O objetivo principal é opcional na validação compartilhada e no contrato PHP, permitindo salvar o cadastro inicial sem esses campos. Os dados existentes são preservados na edição.

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
