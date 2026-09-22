---
{
  "id": "ta-pago.docs.06-operations.environment-variables",
  "title": "Variáveis de ambiente",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": true,
  "sources": [
    "src/components/external-link.tsx",
    ".gitignore"
  ]
}
---

# Variáveis de ambiente

## Inventário atual

Nenhuma variável de ambiente de negócio é exigida pelo aplicativo. `process.env.EXPO_OS` aparece no componente de links como seleção de plataforma fornecida pelo Expo. Não há credencial de backend ou RAG configurada.

## Política para futuras variáveis

Documentar nome, finalidade, obrigatoriedade, ambiente e responsável antes de introduzir uma variável. Valores públicos incorporados ao cliente nunca devem conter segredos. Credenciais de servidor devem permanecer fora do bundle e do Git.

O `.gitignore` exclui `.env` e `.env.*`, com exceção de `.env.example`. Criar exemplo somente quando houver variáveis reais necessárias, usando placeholders sem valores reais. Não indexar arquivos de ambiente na base de conhecimento.
