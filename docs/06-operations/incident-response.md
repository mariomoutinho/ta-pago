---
{
  "id": "ta-pago.docs.06-operations.incident-response",
  "title": "Resposta a incidentes",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": true,
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
  "related_documents": [],
  "framework_version": null,
  "domain": "operations"
}
---

# Resposta a incidentes

Procedimento proposto para operação futura; não há serviço em produção, plantão ou SLA configurado.

1. Registrar impacto, horário e versão sem copiar dados pessoais ou segredos.
2. Identificar responsável e conter a causa com uma ação reversível.
3. Em exposição de credencial, revogar ou rotacionar no provedor; apagar do arquivo não invalida a credencial.
4. Corrigir, validar e comunicar somente fatos confirmados às pessoas autorizadas.
5. Registrar causa, efeitos, recuperação e prevenção em documento sem dados sensíveis.

## Incidente documental

Se uma fonte incorreta ou privada entrar no catálogo, desmarcar `indexable`, reconstruir manifesto e emitir plano de remoção para o consumidor futuro. Se houver índice externo no futuro, confirmar exclusão de todos os chunks e caches. Hoje o catálogo é local e nenhum índice externo é mantido.

Retenção, comunicação externa e responsabilidades precisam ser definidas antes da operação real.
