---
{
  "id": "ta-pago.docs.07-ai.task-student-home",
  "title": "Área inicial do aluno e acesso local",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-29",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/app/index.tsx",
    "src/app/treinos.tsx",
    "src/components/personal/ui.tsx",
    "tests/personal/browser/app.spec.ts",
    "tests/personal/workouts.test.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.02-architecture.navigation"
  ],
  "framework_version": null,
  "domain": "ai"
}
---

# Área inicial do aluno e acesso local

## Objetivo e estado inicial

Preparar a visualização do aluno vinculado ao professor, reutilizando um cadastro local existente. Branch main, revisão inicial 4537a64. Havia um arquivo não rastreado de metadados de download, preservado. A conta de aluno, o aceite de convite e a consulta de planos publicados já existiam; faltava um acesso evidente aos treinos na home móvel.

## Alterações

A home do aluno prioriza treinos, professor, objetivo e acompanhamento. O formulário de convite permanece aberto sem vínculo e fica disponível sob demanda para quem já possui acompanhamento. A página de treinos tem título específico da área do aluno e retorno à home. Carregamento, erro e nova tentativa são tratados separadamente para vínculos e planos.

Foi preparado um acesso de demonstração somente no banco local, com papel student e vínculo ao cadastro solicitado, sem duplicar o aluno. O e-mail técnico não corresponde a um contato pessoal. Senha aleatória e instruções ficam em arquivo ignorado em data; não integram o catálogo nem este documento. Um backup consistente antecedeu a operação. A entrada de histórico identifica preparação local pelo responsável e não registra consentimento fictício do aluno. Nenhum rascunho foi publicado. A ativação local para revisão não substitui o fluxo de convite e aceite do titular no uso real.

## Validação em 29/10/2026

- Novo cenário Playwright no Edge: aprovado. Cobre aluno sem vínculo, aceite de convite, professor identificado, rascunho oculto, publicação pelo professor, navegação para rotinas e acompanhamento, persistência após recarga, ausência de edição e bloqueio da API profissional.
- Layout: screenshots revisadas em 390 px e desktop; ausência de overflow verificada em 320 e 390 px.
- tests/personal/workouts.test.ts: 11 testes aprovados, incluindo isolamento de contas e regras de publicação.
- typecheck, personal:typecheck e personal:build: aprovados.
- Login real do acesso local, vínculo ao professor selecionado, lista vazia de treinos publicados e resposta 403 na API profissional: verificados. A sessão de verificação foi encerrada.
- docs:validate, code:inventory, knowledge:build, code:check e knowledge:check: executados com sucesso.
- docs:test: 31 aprovados e 2 falhas EPERM em criação de links simbólicos no Windows.
- code:test: 17 aprovados e 3 falhas, sendo duas EPERM em links simbólicos e uma asserção de proveniência. São as falhas já descritas no relatório de 27/10, sem correção neste escopo.

O navegador integrado não estava conectado; a verificação usou os testes de navegador do projeto. A suíte completa, dispositivos nativos, publicação pública e CI remota não foram validados nesta tarefa.
