---
{
  "id": "ta-pago.docs.06-operations.release-process",
  "title": "Processo de entrega",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": true,
  "sources": []
}
---

# Processo de entrega

## Situação atual

Não há pipeline de publicação do app, configuração EAS ou ambiente de produção definido. Há validação documental no GitHub Actions; push não equivale a release do produto.

## Fluxo de desenvolvimento

1. Inspecionar branch, remoto, estado do Git e instruções locais.
2. Implementar somente o escopo autorizado e preservar mudanças preexistentes.
3. Executar verificações adequadas, atualizar documentos e reconstruir manifesto.
4. Revisar diff, arquivos incluídos e possíveis segredos.
5. Fazer commit descritivo apenas dos arquivos da tarefa e push normal para a branch atual.
6. Informar hash, branch, validações e limitações. Se push falhar, manter commit local e explicar a causa.

Não usar force push, reescrever histórico ou descartar mudanças locais. A sincronização remota deve preservar o histórico; conflitos que exijam decisões do usuário devem ser apresentados.

## Release futura

Definir assinatura, ambientes, versionamento, testes de dispositivo, distribuição, rollback e responsáveis antes de publicar. A CI de documentos não exige nem recebe segredos de deploy.
