---
{
  "id": "ta-pago.docs.02-architecture.data-model",
  "title": "Modelo conceitual de dados",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-09-22",
  "language": "pt-BR",
  "tags": [
    "02-architecture"
  ],
  "indexable": true,
  "sources": [],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.0.0",
  "authority": "architecture",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": null,
  "domain": "architecture"
}
---

# Modelo conceitual de dados

Modelo proposto, sem migrations, tabelas, ORM ou banco escolhido. Identificadores e cardinalidades orientam discussão, não constituem um esquema definitivo.

| Entidade | Relações e atributos essenciais propostos |
| --- | --- |
| Usuário | Identidade, nome de exibição e papéis; 1:N atividades. |
| Vínculo professor-aluno | N:M usuários, estado, início e encerramento; acesso depende de vínculo ativo. |
| Atividade | Proprietário, tipo e data; pode originar publicação, corrida ou conclusão. |
| Publicação | Autor, atividade opcional, mídia e visibilidade. |
| Grupo / Participação | N:M usuários e grupos, papel e estado de adesão. |
| Treino / Versão / Exercício prescrito | Professor, aluno, ordem, séries, repetições, carga, descanso e referência de vídeo. |
| Execução de treino | Aluno, versão prescrita, data e resultados realizados. |
| Corrida | Proprietário, distância em unidade canônica e data; duração ainda a definir. |
| Desafio / Participação | Grupo, período, métrica, meta e participantes. |
| Evento de pontos | Usuário, origem, regra versionada, valor e chave de idempotência. |
| Conquista / Concessão | Critério versionado, usuário e evento que justificou concessão. |

## Invariantes propostas

Preservar a prescrição usada em uma execução; não duplicar eventos de pontos; validar distâncias positivas e finitas; impedir acesso cruzado entre alunos; separar publicação social de histórico privado.

## Decisões pendentes

Exclusão e retenção, fuso canônico, precisão de distância, política de alterações retroativas, múltiplos professores e armazenamento de mídia. Rankings podem ser projeções de eventos; implementação depende de ADR.
