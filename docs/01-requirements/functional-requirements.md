---
{
  "id": "ta-pago.docs.01-requirements.functional-requirements",
  "title": "Requisitos funcionais",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "01-requirements"
  ],
  "indexable": true,
  "sources": [],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "requirement",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.03-features.achievements",
    "ta-pago.docs.03-features.challenges",
    "ta-pago.docs.03-features.groups",
    "ta-pago.docs.03-features.points-and-ranking",
    "ta-pago.docs.03-features.running-records",
    "ta-pago.docs.03-features.social-feed",
    "ta-pago.docs.03-features.teacher-student-monitoring",
    "ta-pago.docs.03-features.workouts"
  ],
  "framework_version": null,
  "domain": "requirements"
}
---

# Requisitos funcionais

Todos os requisitos estão **planejados**. IDs são estáveis para rastrear tarefas, critérios e futuras evidências de implementação.

| ID | Capacidade | Especificação |
| --- | --- | --- |
| RF-01 | Publicar fotos de treinos e compartilhar atividades com amigos. | [Rede social fitness](../03-features/social-feed.md) |
| RF-02 | Reunir amigos para compartilhar atividades e participar de desafios. | [Grupos](../03-features/groups.md) |
| RF-03 | Reconhecer participação com pontos e ordenar resultados em um período e grupo. | [Pontos e rankings](../03-features/points-and-ranking.md) |
| RF-04 | Permitir ao professor organizar exercícios por aluno com séries, repetições, carga, descanso e vídeo ilustrativo. | [Treinos personalizados](../03-features/workouts.md) |
| RF-05 | Registrar quilômetros corridos e acompanhar totais por período. | [Registro de corridas](../03-features/running-records.md) |
| RF-06 | Criar desafios de grupo com objetivo, métrica, participantes e período. | [Desafios coletivos](../03-features/challenges.md) |
| RF-07 | Conceder títulos e medalhas conforme critérios verificáveis de participação e evolução. | [Títulos e conquistas](../03-features/achievements.md) |
| RF-08 | Permitir ao professor cadastrar alunos e acompanhar treinos concluídos, corridas, desafios e evolução. | [Acompanhamento de alunos](../03-features/teacher-student-monitoring.md) |
| RF-09 | Identidade, perfis e autorização por vínculo. | Proposta de fundação; provedor ainda indefinido. |
| RF-10 | Suporte e moderação pelo administrador. | Escopo e permissões ainda precisam de aprovação. |

RF-01 a RF-08 traduzem a visão recebida. RF-09 e RF-10 são propostas de suporte a essa visão, não decisões de tecnologia ou funcionalidades existentes. Prioridade e recortes de MVP serão aprovados antes da implementação.
