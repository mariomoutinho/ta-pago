---
{
  "id": "ta-pago.docs.04-development.coding-guidelines",
  "title": "Diretrizes de desenvolvimento",
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

# Diretrizes de desenvolvimento

Preservar TypeScript estrito e os aliases existentes. Usar componentes pequenos, propriedades tipadas e os tokens de tema quando aplicável. Separar diferenças de plataforma em variantes quando a implementação atual já utiliza esse padrão.

Antes de escrever código, consultar [Expo 57](https://docs.expo.dev/versions/v57.0.0/). Não atualizar dependências, alterar rotas ou escolher serviços como efeito colateral de documentação.

## Regras para documentação

Escrever em português do Brasil; distinguir estado observado de proposta. Atribuir IDs estáveis a requisitos e documentos, citar arquivos locais como evidência e manter links relativos. Atualizar `updated_at` quando revisar conteúdo, sem alterar o ID em renomeações.

Seguir o [contrato de metadados](../../knowledge/README.md). Após editar documentos, executar `npm run knowledge:build` e validar. Evitar incluir credenciais, dados reais de alunos, arquivos locais ou cópias de documentação externa no corpus.
