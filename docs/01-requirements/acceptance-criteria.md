---
{
  "id": "ta-pago.docs.01-requirements.acceptance-criteria",
  "title": "Critérios de aceitação",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-21",
  "language": "pt-BR",
  "tags": [
    "01-requirements"
  ],
  "indexable": true,
  "sources": []
}
---

# Critérios de aceitação

Critérios propostos para orientar entregas futuras. Ainda não são testes do produto em execução.

| Requisito | Dado / Quando / Então |
| --- | --- |
| RF-01 | Dada publicação restrita, quando um não autorizado consultar o feed, então ela não será retornada. |
| RF-02 | Dado membro removido, quando tentar abrir o grupo restrito, então o acesso será negado. |
| RF-03 | Dada atividade já pontuada, quando o evento repetir, então o saldo não aumentará. |
| RF-04 | Dada execução em uma versão, quando a prescrição mudar, então o histórico manterá a versão original. |
| RF-05 | Dada distância negativa ou não finita, quando salvar, então o registro será recusado sem alterar totais. |
| RF-06 | Dada atividade fora do período, quando calcular desafio, então ela não somará progresso. |
| RF-07 | Dado marco já reconhecido, quando reavaliar, então não haverá concessão duplicada. |
| RF-08 | Dado vínculo encerrado, quando professor consultar aluno, então o acesso será negado. |
| RF-09 | Dada identidade sem permissão, quando acessar recurso protegido diretamente, então a operação será negada. |
| RF-10 | Dada ação administrativa autorizada, quando executada, então haverá registro de auditoria sem exposição desnecessária. |

## Conclusão de uma entrega

Associar requisito, critérios, implementação e resultado de teste. Atualizar estado documental somente com evidência no código e validação. Registrar limitações por plataforma e atualizar o manifesto no mesmo commit.
