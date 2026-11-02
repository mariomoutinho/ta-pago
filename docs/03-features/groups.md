---
{
  "id": "ta-pago.docs.03-features.groups",
  "title": "Grupos",
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
  "domain": "social"
}
---

# Grupos

## Estado observado

O personal cria grupos privados em **Grupos e desafios**, no painel e no menu. Cada grupo tem nome, descrição e convite individual por link. O aluno abre o convite, entra em sua conta se necessário e aceita participar; somente alunos com vínculo ativo com o personal do grupo podem ingressar. Abrir o convite não inclui o aluno automaticamente. A repetição do aceite conserva a mesma participação.

O aceite informa que o nome e o número de treinos elegíveis ficam visíveis aos participantes. O grupo mostra desafios, ranking e os últimos 30 registros explicitamente compartilhados. O personal proprietário e membros com vínculo ativo podem consultar; outros professores, alunos e visitantes não recebem conteúdo. Convites expõem apenas apresentação e quantidade de membros ao usuário autenticado, sem fotos, comentários ou ranking.

Ao concluir o treino, foto/comentário começa com destino privado **Somente meu personal**. O aluno pode selecionar um grupo do qual participa; somente o grupo escolhido recebe o registro. Não há envio automático para todos os grupos. Sair retira o aluno do ranking e muda seus registros compartilhados naquele grupo para privados entre aluno e personal. Uma eventual nova entrada começa outro período de participação, sem republicar registros antigos.

## Persistência e API

FitnessGroup, FitnessGroupMember e FitnessChallenge usam o banco existente. WorkoutFeedback guarda o destino opcional do grupo e a foto JPEG reduzida. GET/POST /fitness-groups lista/cria; GET/POST /fitness-groups/invite/:code apresenta/aceita; GET /fitness-groups/:id consulta; POST /fitness-groups/:id/challenges cria desafio; POST /fitness-groups/:id/leave encerra participação. O servidor revalida identidade, propriedade e vínculo em todas as operações.

Aplicar somente migrations/20261102_training_groups.sql sobre a base existente, após backup privado. Não executar schema.sql na produção preenchida. Publicar Groups.php antes de bootstrap.php e dos consumidores, os contratos/modelos e o runtime, seguidos da web. A migração preserva prescrições e cargas; não altera configurações, contas ou credenciais. Fotos ficam no banco privado e devem ser incluídas no backup.

## Escopo e validação

Este fluxo cobre grupos privados entre personal e seus alunos, convites voluntários e registros do treino. Grupos públicos, chat, reações, moderação avançada e convites a pessoas sem vínculo permanecem fora da implementação. Não depende de serviço social externo. Testes cobrem convite repetido, leitura cruzada negada, participação, ranking, saída e retirada do compartilhamento; o navegador valida criação do grupo e do desafio, aceite e postagem de foto/comentário.
