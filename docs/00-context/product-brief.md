---
{
  "id": "ta-pago.docs.00-context.product-brief",
  "title": "Visão do produto",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "00-context"
  ],
  "indexable": true,
  "sources": [
    "src/app/index.tsx",
    "src/app/explore.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "product",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.00-context.personas",
    "ta-pago.docs.01-requirements.functional-requirements"
  ],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "product"
}
---

# Visão do produto

O Tá Pago será uma rede social fitness para amigos compartilharem atividades e professores acompanharem alunos online. O objetivo é incentivar constância, cooperação e acompanhamento da evolução individual.

## Estado e escopo

Hoje existe uma base Expo com Home e Explore demonstrativos, temas e componentes de interface. Nenhum fluxo de negócio está implementado. A visão abaixo vem do escopo solicitado pelo responsável pelo produto; regras detalhadas são propostas para revisão.

O escopo planejado inclui fotos de treinos, atividades, grupos, pontos, desafios coletivos, rankings, títulos, medalhas, quilômetros corridos e evolução. Professores poderão cadastrar alunos, prescrever exercícios com séries, repetições, carga, descanso e vídeos, e acompanhar execução e corridas.

## Princípios

Privacidade por padrão, acessibilidade, incentivo sem constrangimento e pontuação transparente. O app não deve transformar competição em incentivo ao excesso de exercício. Dados de alunos devem ser visíveis somente a quem tiver autorização.

## Decisões pendentes

Definir MVP, regras de amizade, moderação, pontuação, aprovação de vínculos e critérios de evolução. Backend, banco, autenticação, hospedagem e integrações ainda não foram escolhidos.

## Indicadores propostos

Avaliar adesão semanal, conclusão de treinos e participação em desafios após definir consentimento e coleta mínima. Não existem métricas de produção.

Veja [requisitos](../01-requirements/functional-requirements.md) e [personas](personas.md).
