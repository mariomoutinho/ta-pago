---
{
  "id": "ta-pago.docs.07-ai.task-personal-integration",
  "title": "Integração Personal — registro da tarefa",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "server/app.ts",
    "tests/personal/api.test.ts",
    "tests/personal/access.test.ts",
    "tests/personal/import.test.ts",
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

# Integração Personal — registro da tarefa

## Objetivo e escopo

Incorporar o acompanhamento de personal trainer ao Tá Pago e adaptar o layout à identidade existente. Entrega local web com código compartilhado para nativo; publicação em loja e hospedagem pública não fazem parte desta alteração.

## Evidências iniciais

Branch main, remoto mariomoutinho/ta-pago, árvore limpa no início. Cliente Expo com Home/Explore; Compasso separado com SQLite e dados locais. Alterações foram preservadas durante reinícios do WSL.

## Decisões

API Express com SQLite e variável PERSONAL_DATABASE_URL independente do RAG. Modelo de contas e autorização no servidor, convites únicos e revogação preservando histórico do aluno. Componentes React Native compartilhados, navegação responsiva e identidade TP. Importação transacional somente para destino vazio, origem somente leitura e sessões descartadas.

## Alterações e validação

21 testes de API/importação passaram com SQLite temporário: CRUD, questionário, conclusão imutável, isolamento, vínculo, revogação, token nativo e migração. Teste Playwright passou em Chromium: cadastro, aluno persistente após recarga e viewport móvel escuro sem transbordamento. Build web e verificação TypeScript passaram. Testes documentais e inventário são executados no fechamento. Não houve teste em aparelho Android/iOS nem implantação de produção.

## Conhecimento e entrega

Documentação de execução, arquitetura, navegação, modelo e funcionalidades revisada. Catálogos gerados a partir do código e documentos, sem banco de alunos, exportações ou .env. A revisão-base configurada foi mantida; não foi inventado SHA futuro. Commit e push seguem o fluxo autorizado, com resultado informado na entrega.
