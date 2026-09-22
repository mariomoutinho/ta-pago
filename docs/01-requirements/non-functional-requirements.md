---
{
  "id": "ta-pago.docs.01-requirements.non-functional-requirements",
  "title": "Requisitos não funcionais",
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
  "related_documents": [],
  "framework_version": null,
  "domain": "requirements"
}
---

# Requisitos não funcionais

Metas propostas; nenhuma certificação ou medição é afirmada.

| ID | Requisito | Como verificar futuramente |
| --- | --- | --- |
| RNF-01 | Acesso mínimo a registros e vínculos. | Testes negativos por perfil e recurso, inclusive chamadas diretas. |
| RNF-02 | Acessibilidade em fluxos principais. | Leitor de tela, foco, teclado na web, contraste e ampliação de texto. |
| RNF-03 | Mesmas regras de negócio nas plataformas suportadas. | Cenários equivalentes em Android, iOS e web. |
| RNF-04 | Eventos de conclusão e pontuação idempotentes. | Repetir envio e reconectar sem duplicar efeitos. |
| RNF-05 | Evolução auditável das regras. | Preservar versão de treino, regra de pontos e origem do registro. |
| RNF-06 | Observabilidade sem dados sensíveis. | Revisar logs, erros e telemetria antes de produção. |
| RNF-07 | Documentação consistente e reproduzível. | Executar validação, testes documentais e comparação do manifesto. |

Desempenho, disponibilidade, tamanho de uploads e retenção precisam de metas numéricas após escolha de infraestrutura e validação do MVP. Não há SLA atual.
