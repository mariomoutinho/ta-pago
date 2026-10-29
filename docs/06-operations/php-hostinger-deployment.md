---
{
  "id": "ta-pago.docs.06-operations.php-hostinger-deployment",
  "title": "Hostinger Single — implantação PHP em tapago",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-29",
  "language": "pt-BR",
  "tags": ["06-operations", "php", "migration"],
  "indexable": true,
  "sources": ["backend-php/bootstrap.php", "backend-php/config.example.php", "backend-php/public/.htaccess", "backend-php/public/api/index.php", "backend-php/bin/console.php", "scripts/php/build.mjs", "scripts/php/export-sqlite.mjs", "scripts/php/export-sql.mjs", ".github/workflows/php-validation.yml", "app.config.ts"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "operations", "reviewer"],
  "sensitivity": "internal",
  "supersedes": ["ta-pago.docs.06-operations.hostinger-deployment"],
  "related_documents": ["ta-pago.docs.06-operations.php-migration"],
  "framework_version": "Expo 57; PHP 8.3; MySQL 8; MariaDB 10.4",
  "domain": "operations"
}
---

# Hostinger Single — implantação PHP em tapago

## Destino e limite desta entrega

Destino: hospedagem **Single Web Hosting existente**, em `public_html/tapago`. Endereço: `https://SEU-DOMINIO/tapago/`. O frontend continua Expo Web; o servidor recebe somente arquivos estáticos e PHP. Não executar Node, npm, Prisma, Express ou serviços RAG na hospedagem.

Esta é uma preparação local. **Nenhum deploy, alteração de DNS ou importação de produção foi feito.** A liberação depende das pendências do [relatório de migração](php-migration.md). Os comandos `production:*` e `hostinger.mjs` continuam como referência do Express anterior; não usar no Single.

A Hostinger informa que [Single não oferece SSH](https://www.hostinger.com/support/1583245-how-to-connect-to-a-hosting-plan-via-ssh-in-hostinger/). Este procedimento usa GitHub para build, Gerenciador de Arquivos para upload e phpMyAdmin para dados, sem depender de SSH, SFTP, upgrade ou outra hospedagem.

## Etapa 1 — validar e gerar localmente

Usar Node da `.nvmrc` somente na máquina local/CI, PHP 8.3 com `pdo_mysql`, `mbstring`, `openssl`, `sodium` e MySQL/MariaDB exclusivo de teste.

```bash
npm ci
npm run php:generate
npm run typecheck
npm run php:lint
npm run php:test
npm run php:build
npm run php:browser
```

`PHP_BIN` pode apontar para o executável PHP. Os testes usam banco em `127.0.0.1:33316` e servidor PHP temporário em `33317`. Definir `TAPAGO_TEST_DSN`, `TAPAGO_TEST_USER` e `TAPAGO_TEST_PASSWORD` para o banco isolado. **Nunca apontar testes para produção.** O usuário de testes precisa de CREATE DATABASE: são criados bancos novos `tapago_test_*`, preservados para inspeção, sem apagar bases existentes. A API de produção não precisa desse privilégio.

`php:browser` exige Chromium do Playwright ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE` apontando para navegador compatível. Usa configuração sintética de `php:test` e pacote de `php:build`. O servidor embutido PHP é exclusivo de teste.

O build cria `data/php-release-*`; seu caminho fica em `data/php-last-release.txt`:

```text
manifest.json                    hashes do pacote
public_html/tapago/              HTML, JS, CSS, imagens, .htaccess
public_html/tapago/api/index.php
tapago-private/                  irmão de public_html
  bootstrap.php
  src/
  generated/
  bin/console.php
  schema.sql
  config.example.php
```

O build configura `TAPAGO_WEB_BASE_PATH=/tapago` e `EXPO_PUBLIC_PERSONAL_API_URL=/tapago`. Não são segredos. O pacote exclui configuração real, dados, sessões, chaves, dependências Node e testes. Assets estáticos do Expo podem conter `assets/node_modules` no caminho; são imagens/fontes, não dependências de runtime.

## Etapa 2 — GitHub sem publicação automática

1. Após revisar/enviar o código, abrir Actions → **PHP e MySQL — validar e preparar pacote** → Run workflow na revisão desejada.
2. O workflow manual testa PHP 8.3/MySQL 8, migração sintética e navegador. Só gera `tapago-php-validado` se tudo passar.
3. Baixar o artifact, conferir `manifest.json` e revisão. Expira em sete dias e não contém dados reais.
4. Não há credenciais Hostinger, job de deploy, FTP ou importação remota. Não usar automações de outros sites.

É possível gerar o mesmo pacote localmente. Não contratar build pago nem habilitar faturamento adicional no GitHub; se a franquia não estiver disponível, usar build local. Workflow configurado não significa CI executada.

## Etapa 3 — ensaio dos dados

O exportador abre SQLite somente para leitura, em transação consistente. Para o ensaio, usar backup consistente validado. Não copiar apenas `.db` em uso ignorando o WAL. O snapshot privado deve permanecer em `data/`, fora do Git.

```bash
# Simulação: mostra contagens, sem gravar snapshot.
npm run php:export -- CAMINHO-DO-BACKUP.db
# Arquivo novo; recusa sobrescrever.
npm run php:export -- CAMINHO-DO-BACKUP.db data/migracao.json
```

Preserva IDs, vínculos, hashes de senha, históricos, séries/presets, revisões, datas, JSON e fichas cifradas. Não transfere `Session`, `Invitation` nem `EnrollmentChallenge`: todos entram novamente e convites pendentes precisam ser reemitidos. **Preservar a chave AES original em enrollmentKey**; trocar a chave torna fichas existentes ilegíveis.

Copiar `config.example.php` para arquivo privado local, configurar **outro banco local vazio** e definir `TAPAGO_CONFIG` com esse caminho:

```bash
php backend-php/bin/console.php check
php backend-php/bin/console.php schema
php backend-php/bin/console.php schema --apply
php backend-php/bin/console.php import data/migracao.json
php backend-php/bin/console.php import data/migracao.json --apply
php backend-php/bin/console.php verify data/migracao.json
npm run php:sql -- data/migracao.json data/importacao.sql
```

`schema`/`import` sem `--apply` simulam. Importação PDO exige destino vazio, valida checksum/contrato/chave das fichas e usa transação com FKs habilitadas. `verify` compara os registros, não apenas as contagens; executar antes de abrir o banco à aplicação, pois logins atualizam hashes antigos. DDL não é transacional: falha ao criar esquema exige outro destino vazio.

O SQL inclui esquema e dados para phpMyAdmin, sem instalador HTTP. Não enviá-lo ao GitHub nem a `public_html`. Não contém DROP, REPLACE, INSERT IGNORE ou desativação de FKs. Importar somente em banco vazio e interromper no primeiro erro. Como phpMyAdmin pode executar lotes e DDL faz commit implícito, não presumir rollback integral: abandonar destino parcial e repetir em banco vazio depois da correção. Nunca reparar importação parcial sobre base em uso.

Para instalação totalmente vazia, `seed --apply` cria apenas o questionário inicial. Na migração, importar primeiro; não fazer seed antes de importar.

## Etapa 4 — publicação manual após validação e autorização

1. No hPanel, confirmar domínio, capacidade do banco existente e acesso a pasta privada fora de `public_html`. Não ocupar/substituir banco de outro site. Se o limite da conta impedir destino seguro, revisar o estado da conta sem contratar outro plano.
2. Configurar [PHP 8.3/extensões](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/), confirmar sodium, SSL e redirecionamento obrigatório HTTPS. Verificar impacto sobre outros aplicativos do mesmo site antes de alterar configurações.
3. Fazer backup dos arquivos/banco atuais. Na transferência final, suspender gravações na origem, produzir novo snapshot consistente e repetir o ensaio/comparação.
4. No [phpMyAdmin da Hostinger](https://www.hostinger.com/support/1884149-how-to-import-a-database-with-phpmyadmin-in-hostinger/), selecionar explicitamente o banco vazio aprovado e importar o SQL validado. Conferir contagens, relacionamentos e dados antes de liberar acesso. Uma exportação SQL do destino pode ser reimportada localmente em banco vazio para executar `verify` sem SSH remoto. Upload concluído não comprova importação correta.
5. Pelo Gerenciador de Arquivos HTTPS, enviar apenas `public_html/tapago` para essa subpasta, incluindo `.htaccess`. Não sobrescrever a raiz ou outros diretórios do site principal.
6. Colocar `tapago-private` como **irmão de public_html**. Criar `config.php` privado usando o exemplo: origem HTTPS sem caminho, basePath `/tapago`, DSN, usuário, senha, chave AES e retenção. Não copiar `.env` inteiro. Usar permissões restritas à conta/PHP, sem 777. Confirmar que `open_basedir` permite o include privado; caso contrário, publicação pendente.
7. A API precisa somente SELECT, INSERT, UPDATE e DELETE nas tabelas próprias. Separar credenciais de esquema/importação quando o painel permitir. Desabilitar `registrationEnabled` para fechar autoinscrição; contas existentes continuam entrando.
8. Conferir `/tapago/api/health`, login, professor/aluno, rascunho invisível, treino publicado visível, séries, avaliações e cadastro público. Testar links diretos/recarga, logout e cookies Secure/HttpOnly/SameSite. Verificar bloqueio de arquivos privados, MIME, CSP, vídeos e cache. PHP local não interpreta Apache/LiteSpeed.
9. Só liberar gravações após homologação. Não manter Express e PHP aceitando gravações independentes. Guardar origem, chave e backup protegido.

## Segurança, manutenção e recuperação

Sessões PHP duram 12h; apenas o hash do token é persistido. Senhas scrypt legadas são verificadas com sodium e convertidas após login para bcrypt sobre SHA-384, sem truncar senhas longas. Origem e `X-Requested-With` são conferidos, com autorização no servidor e sem CORS externo. Limites de autenticação/cadastro usam o IP fornecido pelo servidor, sem confiar em `X-Forwarded-For` do cliente; validar o proxy para não agregar usuários indevidamente.

Queries são parametrizadas e erros internos não expõem dados. `.htaccess` bloqueia arquivos privados/índices, define headers e separa API de fallback SPA. TLS, backups e permissões dependem da configuração real e ainda exigem homologação.

`php bin/console.php purge` simula a remoção de cadastros pendentes/recusados vencidos; `--apply` executa. Se houver cron PHP no painel, configurar o caminho privado exato após testar. A listagem aplica retenção ao proprietário consultado; sem cron, a limpeza global periódica permanece tarefa operacional. Não expor endpoint de importação/limpeza.

Antes de liberar gravações, falhas permitem retirar a nova versão e restaurar arquivos/origem preservados. Após novas gravações MySQL, retornar apenas ao SQLite perde alterações: exportar e reconciliar primeiro. Não há migração reversa automática nesta entrega.
