---
{
  "id": "ta-pago.docs.03-features.challenges",
  "title": "Desafios coletivos",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-02",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": ["src/app/grupos.tsx", "src/app/grupo/[code].tsx", "server/groups.ts", "backend-php/src/Groups.php", "shared/groups.ts", "prisma/schema.prisma", "backend-php/migrations/20261102_training_groups.sql"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "3.0.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.01-requirements.functional-requirements",
    "ta-pago.docs.02-architecture.data-model"
  ],
  "framework_version": null,
  "domain": "fitness"
}
---

# Desafios coletivos

## Estado observado

O personal cria desafios dentro dos seus grupos, com título, data inicial, data final e meta individual de treinos. A tela aceita datas DD/MM/AAAA e valida o período. Participam os alunos que aceitaram ingressar naquele grupo e mantêm vínculo ativo com o personal.

## Contagem e ranking

A métrica é quantidade de treinos concluídos: usa WorkoutCompletion, único por treino/dia de São Paulo. Uma foto ou comentário não adiciona pontos. Contam conclusões registradas após a entrada no grupo, com completedOn dentro do intervalo inclusivo do desafio, em treinos do personal do grupo. Conclusões de outro professor e anteriores à participação não contam. Não há registro retroativo. Dois treinos diferentes concluídos no mesmo dia contam como duas atividades.

O ranking mostra nome e quantidade/meta, por contagem decrescente e nome em caso de empate. A meta atingida é sinalizada; o total pode superar a meta. Desafios futuros e encerrados permanecem consultáveis com o próprio período. Sair do grupo remove a participação no ranking; voltar não recupera pontos anteriores à nova entrada.

## Limites e validação

Métricas de distância/calorias, equipes, prêmios, validação por dispositivos, regras competitivas personalizadas e edição/exclusão de desafio ainda não estão implementadas. Conclusões são autorrelatadas pelo aluno; foto é opcional. Os testes cobrem autoria do desafio, limites de acesso, participação voluntária, não duplicação da conclusão e ranking.
