---
{
  "id": "ta-pago.docs.07-ai.task-protocol",
  "title": "Protocolo de tarefas",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "policy",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.07-ai.task-template"
  ],
  "framework_version": null,
  "domain": "ai"
}
---

# Protocolo de tarefas

## Entrada mínima

Registrar objetivo, escopo, requisito associado, restrições, critérios de aceitação e estado inicial do Git. Se a tarefa for documental, não alterar o aplicativo como efeito colateral.

## Execução

1. Ler README, AGENTS, arquivos afetados e fontes citadas.
2. Separar observações de propostas e identificar dependências.
3. Executar a menor mudança completa que atenda ao pedido.
4. Validar casos relevantes e registrar limitações.
5. Atualizar documentação, data de revisão e manifesto no mesmo commit.
6. Revisar diff e segredos; fazer commit e push somente conforme as instruções da tarefa, sem reescrever histórico.

## Artefato de entrega

Usar o [modelo de tarefa](task-template.md) para trabalhos que precisem de rastreabilidade duradoura. Informar arquivos, decisões, comandos executados, resultados, pendências, hash e branch. Não incluir dados reais de usuários nos exemplos.

## Recuperação de falhas

Manter alterações válidas, corrigir falhas reproduzíveis e não mascarar validações. Se bloqueado por acesso, informar a operação e o que falta. Não considerar push ou deploy bem-sucedido somente porque o comando foi iniciado.
