---
{
  "id": "ta-pago.docs.04-development.testing",
  "title": "Estratégia de testes",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": []
}
---

# Estratégia de testes

## Verificações disponíveis

| Comando | O que comprova |
| --- | --- |
| `npm run typecheck` | Verificação estática de tipos do aplicativo. |
| `npm run docs:validate` | Metadados, fontes locais, links locais por arquivo, título e IDs únicos. |
| `npm run docs:test` | Regressões dos validadores e planejamento incremental com casos negativos. |
| `npm run knowledge:check` | Manifesto versionado idêntico ao catálogo calculado dos documentos. |

A validação de links não acessa URLs externas nem verifica âncoras de títulos. A CI documental não substitui testes do aplicativo. Não há suíte funcional ou end-to-end do produto configurada.

## Testes futuros

Para cada funcionalidade, partir dos [critérios de aceitação](../01-requirements/acceptance-criteria.md). Cobrir permissões, repetição de operações, falhas de rede e paridade entre plataformas. Testar interface com teclado, leitor de tela e texto ampliado.

## Evidência de entrega

Registrar comandos e resultados, ambiente e limitações. Tipo correto não comprova comportamento de negócio ou funcionamento em dispositivo.
