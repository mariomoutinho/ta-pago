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
    "shared/validation.ts",
    "src/components/personal/student-registration.tsx",
    "src/components/personal/select-field.tsx",
    "src/features/personal/student-registration.ts",
    "server/student-access.ts",
    "backend-php/src/Students.php",
    "backend-php/src/Auth.php",
    "backend-php/migrations/20261126_student_training_group.sql"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.2.0",
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

O cadastro manual inicial apresenta nome completo, e-mail, seleção de grupo, data de nascimento, gênero, WhatsApp, opção de enviar informações de acesso e botão Salvar. As seções Acompanhamento e Saúde e segurança ficam disponíveis na edição do aluno. O objetivo principal é opcional; status, programa vigente e início do acompanhamento não são exibidos no cadastro inicial. A data de início recebe a data local do cadastro.

A seleção de grupo abre uma lista com Presencial, Online e Criar novo grupo. Um novo nome é salvo no campo `Student.trainingGroup` ao salvar o aluno, e reaparece nos cadastros seguintes do mesmo personal enquanto houver um aluno com esse grupo. Esses rótulos organizam cadastros; não criam comunidades sociais ou membros em `FitnessGroup`. O WhatsApp inicia com Brasil e +55, com seleção de país e DDI. Nome, e-mail e grupo são exigidos pelo formulário; nascimento, gênero e WhatsApp são opcionais, exceto quando o envio de acesso é marcado.

Ao marcar Enviar informações de acesso ao aluno, o servidor valida e-mail e telefone internacional antes de salvar e cria um convite de 48 horas na mesma operação do cadastro. A interface abre uma mensagem no WhatsApp para confirmação do envio pelo professor. O aluno define a senha no link de ativação, ou entra com sua senha se já tiver conta, e confirma o vínculo. Não há envio automático de e-mail nem de WhatsApp. Falha ao abrir o WhatsApp mantém o cadastro salvo e oferece reabrir a conversa ou copiar o link, sem cadastrar o aluno novamente. Convites de solicitações pendentes ou rejeitadas continuam bloqueados.

Instalações existentes precisam aplicar a migração [PHP/MySQL](../../backend-php/migrations/20261126_student_training_group.sql) ou a migração Prisma correspondente antes de atualizar o backend. A migração adiciona somente o grupo, com valor vazio para cadastros existentes; os demais dados são preservados.

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
