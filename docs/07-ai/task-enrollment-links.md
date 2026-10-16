---
{
  "id": "ta-pago.docs.07-ai.task-enrollment-links",
  "title": "Link de cadastro — registro da tarefa",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "server/enrollment.ts",
    "tests/personal/enrollment.test.ts",
    "tests/personal/sharing.test.ts",
    "tests/personal/browser/app.spec.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "policy",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": null,
  "domain": "ai"
}
---

# Link de cadastro — registro da tarefa

## Objetivo e escopo

Implementar links de cadastro no módulo Personal existente, mantendo autenticação, banco e identidade visual. O usuário solicitou caminhos locais; domínio público e hospedagem ficam fora desta entrega.

## Evidências iniciais

Branch main, árvore limpa, origem mariomoutinho/ta-pago. Expo 57, Express, Prisma/SQLite e relacionamentos User/Student existentes. Convites individuais já autenticavam a associação posterior à conta.

## Decisões

Solicitação cifrada e pendente antes de criar/reutilizar Student. Saúde opcional em payload separado e consentimento explícito. Token aleatório rotacionável, limites de requisição e desafio temporário único. Nenhuma conta criada pelo formulário. Origem localhost configurável conforme orientação do usuário.

## Alterações e validação

39 testes de API/importação/compartilhamento passaram; duas jornadas Playwright passaram, incluindo formulário público até aprovação. TypeScript, build web e bundles Android/iOS passaram. Testes documentais e de extração passaram. A suíte RAG inicialmente encontrou catálogo desatualizado e PostgreSQL de teste indisponível em 127.0.0.1:5433; o catálogo foi regenerado e as expectativas antigas do template foram atualizadas em knowledge/evaluation/questions.json. Na repetição, 22 testes RAG passaram e um teste de PostgreSQL externo foi explicitamente ignorado por indisponibilidade. Não houve teste nativo em aparelho.

## Conhecimento e entrega

Documentação específica descreve migração, endpoints, chaves, retenção e testes locais/Expo Go. Não indexar fichas, chaves nem dados de alunos. A revisão automática rejeitou a extensão de exclusão que apagaria também Student sem conta, por risco de perda de histórico; essa mudança não foi aplicada. A exclusão da solicitação preserva acompanhamentos associados. O resultado de commit/push é informado ao finalizar.
