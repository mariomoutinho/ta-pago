---
{
  "id": "ta-pago.docs.02-architecture.integrations",
  "title": "Integrações",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "src/components/external-link.tsx"
  ]
}
---

# Integrações

## Existente

Bibliotecas Expo e React Native são dependências locais. `ExternalLink` abre links externos por Expo Router e `expo-web-browser`. Isso não representa integração com serviços fitness.

## Não definido

Autenticação, backend, banco, armazenamento de mídia, push, vídeos, GPS, dispositivos vestíveis, pagamentos e serviços de IA não foram selecionados. O nome Tá Pago não implica funcionalidade financeira.

## Critérios para uma futura integração

Documentar finalidade, dados transmitidos, autorização, falhas, limites, credenciais, custo e alternativa de remoção em ADR. Criar contrato e testes antes de conectar a interface. Dados pessoais de alunos não entram no corpus documental.

Nesta etapa não há embeddings, base vetorial ou chamadas externas de RAG.
