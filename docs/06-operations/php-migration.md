---
{
  "id": "ta-pago.docs.06-operations.php-migration",
  "title": "Migração PHP e MySQL — execução e pendências",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-29",
  "language": "pt-BR",
  "tags": ["06-operations", "migration", "testing"],
  "indexable": true,
  "sources": ["prisma/schema.prisma", "server/app.ts", "server/workouts.ts", "backend-php/src/App.php", "backend-php/src/Auth.php", "backend-php/src/Students.php", "backend-php/src/Evaluations.php", "backend-php/src/Workouts.php", "backend-php/src/Enrollment.php", "scripts/php/test.mjs", "scripts/php/migration-test.mjs", "scripts/php/browser-test.mjs", ".github/workflows/php-validation.yml"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "operations", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.06-operations.php-hostinger-deployment"],
  "framework_version": "Expo 57; PHP 8.3; MySQL 8; MariaDB 10.4",
  "domain": "testing"
}
---

# Migração PHP e MySQL — execução e pendências

## Objetivo e evidências iniciais

Preparar o módulo Personal para PHP 8.3/PDO/MySQL no Single existente, preservando Expo Web, autenticação, alunos, treinos, avaliações e permissões. Sem deploy, mudança de produção ou serviço pago. Estado inicial: branch `main`, backend Express/Prisma/SQLite e metadado de imagem não rastreado preexistente, preservado.

A implementação PHP permanece paralela à original para comparação/recuperação. Os 23 modelos Prisma originam o esquema MySQL; duas tabelas adicionais guardam limites de requisições e recibos de migração. O runtime PHP não depende de Node ou Composer. RAG não faz parte da API do produto e não entra no pacote.

## Etapas e validação local

| Área | Implementado | Evidência executada | Limite |
| --- | --- | --- | --- |
| Contratos/esquema | SQL InnoDB/utf8mb4, JSON Schema e refinamentos PHP explícitos | 23 modelos e 24 contratos gerados | Alterar regras compartilhadas exige revisar refinamentos nos dois backends |
| Autenticação | Cadastro, login/logout, cookie, bearer e atualização de hash | Vetor scrypt Node/PHP; login legado atualiza hash; senha longa Unicode sem truncamento | Aplicativo nativo não homologado |
| Alunos/permissões | Isolamento por professor, convite, vínculo/revogação, exportação e histórico | Acesso cruzado negado; convite consumido; atualização/exclusão de cadastro sem vínculo; professor perde acesso após revogação, aluno mantém histórico | Concorrência e exclusão de cadastro vinculado pelo aluno precisam de regressão ampliada |
| Rotinas/treinos | Publicação, revisões, séries, alternativas, grupos, ordem, exclusão lógica, feedback | Rascunho invisível; treino publicado visível; vazio/exercício alheio rejeitados; revisão antiga bloqueada; feedback idempotente | Ordem de grupos em paralelo e alternativas arquivadas exigem mais casos |
| Biblioteca | Exercícios, programas com treinos, modelos preparados, presets | Presets das sete modalidades; criação/edição/exclusão de programa; ordem válida, grupo separado e revisão antiga testados em modelo | Combinações de valores e edição concorrente ainda exigem mais casos |
| Avaliações | Questionários versionados, rascunho, resposta do aluno, conclusão imutável | Obrigatoriedade; aluno responde; conclusão preservada contra exclusão | Todos os tipos de questões e concorrência ainda exigem regressão |
| Acompanhamento | Seis tipos: monthly, physical, training, technical, social, note | Criação dos seis; correção/exclusão de nota; aluno não cria registro profissional | Extremos numéricos e edição dos demais tipos exigem mais casos |
| Cadastro público | Link/challenge, consentimento, AES-GCM, aprovação e retenção | Challenge único; payload PHP legível pelo Node; isolamento; aprovação; ativo não pode ser excluído | Cron e ciclo de recusa/inativação no hPanel pendentes |
| Migração | SQLite somente leitura; importação PDO; SQL para phpMyAdmin; comparação | Origem intacta; simulação sem escrita; PDO/SQL comparados em 20 tabelas; rollback de FK; corrupção/repetição bloqueadas | Algumas tabelas sintéticas vazias; backup real ainda não ensaiado |
| Expo Web | Build/API em `/tapago`; pacote público/privado | Login, página protegida, recarga e logout em 390px/1280px | PHP local não valida Apache/LiteSpeed, SSL ou CSP |
| GitHub | Workflow manual PHP 8.3/MySQL 8, testes e artifact | Configuração e pacote preparados | CI remota MySQL 8 ainda não comprovada; sem deploy automático |

Foram executadas **82 verificações HTTP**, além de asserções de dados, com **PHP 8.3.36 e MariaDB 10.4.32 local isolado**. Testes PHP adicionais verificaram limite de 20 tentativas e rejeição de sessão expirada. MariaDB não comprova execução em MySQL 8. O workflow prepara essa validação; não se afirma sucesso remoto.

Validações do repositório: `typecheck`, `docs:validate` (50 documentos), `code:inventory`, `code:check`, `knowledge:build` e `knowledge:check` passaram. `docs:test` teve 31 aprovações e 2 falhas por EPERM ao criar symlinks no Windows. `code:test` teve 17 aprovações e 3 falhas: 2 EPERM/symlink e 1 asserção de proveniência SHA. Essas falhas também estavam registradas antes da migração; não foram mascaradas nem corrigidas alterando o escopo RAG/documental.

## Falhas encontradas e soluções

- JSON Schema não representava coerção numérica Zod: marca explícita preserva coerção/limites/inteiros. Cadastro com frequência textual foi testado.
- Alternativa `null` poderia aceitar tipos indevidos: passa a rejeitar valores não nulos. Medidas inválidas foram testadas.
- Empacotamento rejeitou imagens legítimas Expo em `assets/node_modules`: exceção restrita a mídia/fontes estáticas; dependências de runtime seguem excluídas.
- TypeScript apontou referências Node e tipos internos Zod no gerador: ajustados; typecheck passou.
- Importação preserva objetos JSON vazios, verifica a chave antes de gravar e reverte a transação PDO diante de FK inválida.

## Pendências antes de produção

1. Executar CI manual MySQL 8 e confirmar resultados no GitHub.
2. Ampliar regressão de grupos/alternativas, edições dos registros, tipos de questões, combinações de atributos, concorrência e expiração de convites. Resolver separadamente as falhas das suítes documentais no Windows.
3. Ensaiar backup real autorizado: comparar 20 tabelas, IDs, datas, JSON, históricos, fichas e login. Nenhum dado real foi importado nesta etapa.
4. Confirmar hPanel: PHP/extensões, banco disponível, pasta privada, open_basedir, SSL, reescrita e impacto no site principal. Nenhum acesso/alteração Hostinger nesta tarefa.
5. Homologar phpMyAdmin, cookies HTTPS, headers, assets, vídeos, links diretos, backup/restauração e persistência. Publicação exige validação e autorização posteriores.

## Conhecimento e entrega

Seguir o [guia de implantação](php-hostinger-deployment.md). Sessões, convites pendentes e challenges são invalidados na transferência. Express permanece disponível localmente: existência do PHP não significa migração de tráfego/dados.

Snapshots, senhas, chaves e logs ficam fora do Git/artifacts. Metadados documentais usam a revisão-base real de `knowledge/config.json`, sem inventar SHA futuro. O inventário de conhecimento mantém suas coleções documental/código; fontes privadas não são indexadas.
