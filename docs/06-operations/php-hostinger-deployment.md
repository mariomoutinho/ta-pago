---
{
  "id": "ta-pago.docs.06-operations.php-hostinger-deployment",
  "title": "Hostinger Single — implantação PHP em tapago",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-01",
  "language": "pt-BR",
  "tags": [
    "06-operations",
    "php",
    "migration"
  ],
  "indexable": true,
  "sources": [
    "backend-php/src/Auth.php",
    "backend-php/src/Enrollment.php",
    "backend-php/src/App.php",
    "backend-php/src/News.php",
    "backend-php/migrations/20261101_workout_completion.sql",
    "backend-php/tests/completion-migration.php",
    "backend-php/src/Push.php",
    "backend-php/src/PushCron.php",
    "backend-php/public/notifications-sw.js",
    "backend-php/src/Media.php",
    "backend-php/migrations/20261101_exercise_favorites.sql",
    "backend-php/tests/favorites-migration.php",
    "backend-php/src/Workouts.php",
    "backend-php/bootstrap.php",
    "backend-php/config.example.php",
    "backend-php/public/.htaccess",
    "backend-php/public/api/index.php",
    "scripts/php/build.mjs",
    "scripts/php/pwa.mjs",
    "scripts/php/archive.mjs",
    "scripts/php/validate-release.mjs",
    "scripts/php/browser-test.mjs",
    "scripts/php/apache-test.mjs",
    ".github/workflows/php-validation.yml",
    "app.config.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "2.6.0",
  "authority": "code",
  "audience": [
    "developer",
    "operations",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [
    "ta-pago.docs.06-operations.hostinger-deployment"
  ],
  "related_documents": [
    "ta-pago.docs.06-operations.php-migration"
  ],
  "framework_version": "Expo 57; PHP 8.3; MySQL 8; MariaDB 10.4",
  "domain": "operations"
}
---

# Hostinger Single — implantação PHP em tapago

## Destino existente e limites

O responsável informou que já publicou manualmente o aplicativo em **https://tapago.coletivopindorama.com.br**, com PHP/MySQL funcionando. Esta entrega consolida as correções no código e prepara uma atualização; não executa deploy remoto.

O subdomínio aponta diretamente para public_html/tapago. A URL pública é **/**, sem prefixo /tapago. A consulta da hospedagem confirmou esse document root; a configuração privada não foi lida.

| Item | Valor esperado |
| --- | --- |
| Público | public_html/tapago, dentro do diretório do domínio principal |
| Privado | tapago-private, irmão de public_html |
| Configuração preservada | tapago-private/config.php |
| Origem | https://tapago.coletivopindorama.com.br |
| basePath | string vazia |
| API | /api/health e demais rotas /api/* na mesma origem |
| Banco existente | u234997903_tapago; preservar estrutura e dados |
| PHP | 8.3+, pdo_mysql, mbstring, openssl e sodium |

Não usar comandos production:* do Express, implantação Git simples, schema.sql, importação inicial ou seed nesta atualização. O servidor não executará Node/npm/Prisma. A extensão sodium foi habilitada manualmente pelo responsável e precisa continuar ativa. Não contratar novos serviços.

## Validar e gerar o pacote

Usar Node da .nvmrc e dependências do lockfile somente localmente/CI. PHP e MySQL/MariaDB são necessários para testes. ZIP exige PowerShell/.NET no Windows ou zip/unzip no Linux, disponíveis no runner Ubuntu do workflow.

```bash
npm ci
npm run php:generate
npm run typecheck
npm run php:lint
npm run php:test
npm run php:build
npm run php:package-check
npm run php:package-test
npm run php:browser
```

PHP_BIN seleciona PHP 8.3. TAPAGO_TEST_DSN, TAPAGO_TEST_USER e TAPAGO_TEST_PASSWORD devem apontar exclusivamente para banco de teste local, por padrão porta 33316. A suíte cria bases sintéticas novas tapago_test_*, exigindo CREATE DATABASE. Não apontar essas variáveis para produção. O navegador usa localhost:33317 e a configuração sintética produzida pela suíte. Instalar Chromium com npx playwright install chromium ou definir PLAYWRIGHT_CHROMIUM_EXECUTABLE.

Para validar o .htaccess com Apache real, definir TAPAGO_TEST_APACHE_ROOT e PHP_CGI_BIN, então executar node scripts/php/apache-test.mjs. Esse teste usa portas locais 33317/33319 e configuração isolada; não altera os serviços instalados. O servidor embutido PHP sozinho não valida regras Apache.

O comando final de empacotamento é **npm run php:build**. Exporta Expo Web com TAPAGO_WEB_BASE_PATH vazio e EXPO_PUBLIC_PERSONAL_API_URL=/, ignora arquivos dotenv, acrescenta PWA, valida conteúdo, cria ZIP e o descompacta para verificar hashes. Não modifica bundles manualmente. O cliente transforma a barra final em base vazia e solicita /api/*; configurações de desenvolvimento e nativas continuam disponíveis fora desse build.

O caminho do ZIP está em data/php-last-archive.txt; o diretório original está em data/php-last-release.txt. O checksum fica junto ao ZIP com sufixo .sha256. Arquivos gerados ficam ignorados pelo Git.

```text
manifest.json                  inventário SHA-256; não é o manifesto PWA
public_html/tapago/
  index.html, .htaccess, favicon.ico, metadata.json
  manifest.webmanifest
  api/index.php
  _expo/, assets/              inclui ícones PWA 180/192/512
tapago-private/                irmão de public_html
  bootstrap.php
  src/
  generated/
```

O pacote de atualização NÃO contém config.php, config.example.php, bin, schema.sql, SQLite, SQL de dados, chaves, credenciais, sessões, testes ou dependências Node de runtime. A lista positiva e os hashes são verificados antes e depois da compactação. Assets de imagens/fontes do Expo podem ter assets/node_modules no nome: são estáticos.

## GitHub Actions sem deploy

1. Enviar a revisão revisada ao GitHub. O workflow **PHP e MySQL — validar e preparar pacote** é exclusivamente workflow_dispatch, sem publicação ao receber push.
2. Em Actions, executá-lo na revisão desejada. Faz geração/verificação de contratos, typecheck, lint, testes PHP 8.3/MySQL 8, build, validação do pacote e navegador.
3. Baixar o artifact tapago-php-validado, liberado somente após os testes passarem. Ele contém o ZIP interno e seu SHA-256; expira em sete dias. Descompactar o artifact do GitHub localmente para obter o ZIP de implantação.
4. Guardar junto ao pacote a revisão Git e o resultado da execução. Workflow configurado não comprova que uma execução remota passou.

Nenhuma credencial de hospedagem entra no workflow. Não habilitar cobrança adicional: se a franquia do GitHub não estiver disponível, executar o mesmo build localmente.

## Backup antes de qualquer futura publicação

1. Confirmar o subdomínio e as duas pastas no hPanel. Não trabalhar na raiz pública do site principal.
2. Baixar cópia completa da versão atual de public_html/tapago e de tapago-private, incluindo config.php real, para armazenamento privado restrito, fora de Git/artefatos/pastas públicas. Preservar a chave AES existente.
3. Exportar o banco existente por phpMyAdmin para backup privado. Não importar, recriar nem executar schema.sql. Registrar data, versão e contagens; ensaiar restauração em ambiente isolado.
4. Guardar o pacote anterior e seus hashes. Combinar janela breve de manutenção para evitar solicitações enquanto arquivos PHP são substituídos. Upload de arquivos não é atualização atômica.
5. Conferir PHP, extensões, HTTPS, permissões privadas e open_basedir. O front controller procura tapago-private três níveis acima de api/index.php; essa disposição foi testada localmente.

## Atualização manual com preservação

Executar somente depois da validação e da decisão de publicar. **Esta tarefa não executou estes passos na hospedagem.**

1. Conferir SHA-256 do ZIP baixado. No PowerShell: Get-FileHash -Algorithm SHA256 CAMINHO-DO-ZIP. Comparar com .sha256.
2. Extrair localmente ou em pasta temporária PRIVADA fora de public_html. Nunca enviar o ZIP completo para a pasta pública: inclui código privado. Não usar a função de substituir/importar o site inteiro.
3. Pelo Gerenciador de Arquivos, copiar somente os conteúdos correspondentes: public_html/tapago do pacote para public_html/tapago existente; bootstrap.php, src e generated privados para tapago-private existente. Confirmar cada destino. Não criar outra pasta tapago dentro da atual.
4. Mesclar arquivos, preservando config.php real e arquivos/dados desconhecidos. Não substituir nem apagar toda a pasta privada. Não enviar exemplo sobre a configuração. Não alterar site principal, banco ou DNS.
5. Enviar assets com hash primeiro; durante a janela, atualizar PHP privado, api/index.php, .htaccess e index.html. HTML/manifesto usam no-store; não há service worker. Conservar assets anteriores para rollback, sem apagar automaticamente arquivos existentes.
6. Validar raiz, /entrar, /api/health JSON, login/logout, sessão após recarga, aluno, treino publicado, avaliações e mídia em desktop/celular. Rascunhos não devem aparecer para alunos. Validar TLS/cookies Secure e permissões com conta de teste autorizada, sem dados de alunos em logs.
7. Registrar o resultado e encerrar a manutenção. Remover apenas temporários desta atualização após conferir caminhos. ZIP/pasta aninhada antiga encontrada deve ser revisada separadamente antes de remoção.

O .htaccess define RewriteBase /, DirectoryIndex index.html index.php, API antes do fallback SPA, 404 para assets inexistentes, bloqueio de arquivos privados e cabeçalhos de segurança. O arquivo original de produção não foi recuperado pelo conector; as duas diretivas corrigidas foram informadas pelo responsável. O pacote foi testado com Apache local; a verificação final em LiteSpeed/HTTPS permanece etapa de publicação.

## Rollback sem perda de dados

Se a nova versão falhar, manter a manutenção, restaurar arquivos públicos/privados do backup nos mesmos destinos e preservar config.php. Conferir /api/health, login e navegação antes de reabrir. Esta atualização não muda o esquema: rollback dos arquivos utiliza o banco atual. Não restaurar SQL antigo automaticamente: isso descartaria gravações posteriores ao backup. Restauração de dados exige decisão e procedimento próprios.

Futuras alterações de esquema precisam de migrações incrementais identificadas, ensaio em cópia isolada, backup e plano de compatibilidade. O pipeline atual não aplica migrações em produção.

## Atualização autorizada de acesso em 01/11/2026

Após autorização do responsável, o servidor recebeu a restrição de cadastro público a alunos e uma lista privada contendo somente o ID da conta de personal confirmada. A consulta anterior encontrou uma única conta de personal; não foi necessário excluir nem converter contas. Login e sessões, inclusive antigas, verificam a autorização a cada requisição. O cadastro público de personal foi testado em produção e retornou 403, sem criar sessão. A API de saúde permaneceu operacional.

A atualização de Auth.php e config.php usou backup restrito fora de public_html, preservou todas as chaves existentes e não alterou esquema ou dados do banco. O atualizador temporário tinha autenticação própria, destinos fixos, verificação de hashes, restauração em falha e remoção automática; sua ausência foi conferida no diretório público. O frontend foi atualizado separadamente, mantendo o manifesto PWA e os demais arquivos publicados. Identidades, credenciais, IDs autorizados e o conteúdo privado dos backups não pertencem ao repositório nem ao catálogo.

Para novas autorizações, seguir a [política de contas](../03-features/personal-integration.md): decisão do responsável, conta existente e configuração privada por ID. Não reabrir cadastro público de personal nem usar nome de exibição como autorização.

## Atualização incremental de favoritos — 2026-11-01

A coluna Exercise.favorite foi acrescentada pela migração identificada 20261101_exercise_favorites.sql, após ensaio em tabela temporária sintética e backup privado verificado dos exercícios e dos quatro arquivos de runtime afetados. A aplicação verificou hashes da versão anterior antes da escrita e preservou todos os campos existentes; o valor inicial é falso. A migração tem recibo em MigrationReceipt. Não foi aplicado schema.sql ao banco existente.

O atualizador temporário exigiu POST autenticado por segredo efêmero, teve destino e arquivos permitidos fixos e foi removido após verificar a atualização. Configuração, chave de criptografia e autorizações de personal permaneceram preservadas. O backup fica fora de public_html. Em eventual rollback, restaurar os arquivos privados anteriores e o HTML anterior; conservar a coluna aditiva e o backup, sem apagar favoritos ou registros.

A publicação enviou o JavaScript com hash primeiro e o HTML por último, conservando os assets anteriores e os metadados PWA. Foram conferidos hash remoto do JavaScript, referência ativa no HTML, health ok, manifesto standalone e resposta 401 para tentativa de favoritar sem sessão. O caminho do atualizador removido passou a retornar o fallback HTML da aplicação. O teste de navegador foi local e usou dados sintéticos; não foi alterada a seleção de favoritos da conta real durante a verificação.

## Armazenamento de vídeos próprios

Uploads são armazenados em tapago-private/storage/exercise-videos, com diretórios 0700 e arquivos 0600. Preservar essa pasta em atualizações e incluir seus arquivos no backup privado, junto com o banco que contém as URLs. mediaDirectory permite definir um destino privado alternativo. Não apontar para public_html e não publicar backups. O pacote de atualização distribui somente código; não inclui vídeos, dados ou configuração real.

O front controller diferencia exclusivamente PUT /exercise-videos de requisições JSON, e a autenticação ocorre antes de ler o binário. O upload aceita até 25 MiB; arquivos MP4 são servidos pela API autenticada, com suporte a Range. A quota conservadora por personal é 1 GiB; não há compressão ou transcodificação no servidor. Preservar vídeos substituídos até revisão de referências e backup, sem limpeza automática.

Na publicação de 2026-11-01, foram atualizados Media.php, bootstrap.php, Workouts.php, App.php e o front controller, com backup privado, verificação da base e dos hashes finais e remoção do atualizador temporário. O armazenamento privado foi criado e sua permissão de escrita foi conferida. Não houve alteração de banco, credenciais, chave de criptografia ou autorizações. Os testes locais passaram com 113 verificações HTTP, incluindo upload/leitura parcial e isolamento, e reprodução real no pacote PHP em 390 e 1280 px. Android/iOS em aparelhos e binários nativos continuam exigindo validação própria.

## Notificações de cadastro

O PHP usa OpenSSL com suporte a EC prime256v1 e cURL HTTPS para Web Push sem payload pessoal. A chave VAPID é gerada no servidor em storage/push/vapid-private.pem; nunca distribuir ou regenerar durante deploy. Inscrições são cifradas com a chave de criptografia existente. Preservar e incluir storage/push no backup privado, junto com config.php. Não publicar endpoints de inscrição, PEM, tokens ou conteúdo desses backups. Não é necessária alteração de esquema.

O envio imediato ocorre depois do commit e da resposta pública. Para retomar falhas e recuperar interrupções, executar src/PushCron.php pelo PHP 8.3 uma vez por minuto, com o mesmo config.php privado. O comando só retorna contagens, sem destinos ou dados de alunos. Respostas 404/410 removem a inscrição; outras falhas usam espera progressiva de até uma hora, com janela de entrega de 24 horas. A inclusão de um worker público não habilita funcionamento offline: notifications-sw.js recebe push e abre a página de cadastros; não possui handler fetch nem CacheStorage.

Em 01/11/2026, foram publicados os avisos internos e o worker, com verificação dos hashes, backup privado do runtime e preservação das configurações. O servidor confirmou suporte a cURL e chaves EC. A chave VAPID foi inicializada exclusivamente no armazenamento privado. O cron com agenda * * * * * foi criado com PHP 8.3 e sua execução retornou contagens zeradas, sem falhas. A API de resumo exige sessão; o worker público foi conferido com MIME JavaScript. Os testes locais passaram com 125 verificações HTTP no PHP, assinatura verificada independentemente no Node, repetição após falha e remoção de inscrições expiradas. O navegador simulou o evento push e conferiu a notificação; a entrega por provedores reais aguarda a inscrição voluntária e a conferência no aparelho do personal. Os verificadores documentais e de código repetiram as cinco falhas preexistentes de symlink/proveniência no Windows.

Validar ativação explícita, permissão negada, inscrição, desativação/logout, clique do aviso e entrega com o aplicativo fechado em cada aparelho. iPhone/iPad exigem instalação na tela inicial e sistema 16.4 ou superior. O processo depende dos serviços push de navegador/sistema e da conexão. Testes automatizados simulam o provedor e entregam evento push via DevTools; isso não comprova entrega real na tela bloqueada de aparelhos físicos.

## PWA e verificação em aparelhos

O manifesto usa nome Tá Pago, início/escopo / e display standalone. Ícones PNG reais da marca são gerados em 192/512; iOS usa apple-touch-icon 180 e metadados próprios. Não há cache offline. O worker dedicado é registrado quando o personal ativa notificações. A instalação precisa de conexão para consultar dados.

Depois de publicar, no Android abrir o site HTTPS em navegador compatível e usar Instalar aplicativo/Adicionar à tela inicial; no iPhone usar Compartilhar → Adicionar à Tela de Início. Abrir pelo novo ícone e conferir ausência de barra de endereço, login e atualização. A interface varia por navegador/versão. Testar em aparelhos reais: validação automatizada do manifesto em Chromium não comprova instalação nem modo standalone em iOS/Android.

Referências: [critérios de instalação do Edge](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/) e [configuração web app da Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## Transferência automatizada: investigação e pendências

O conector Hostinger oferece geração de URL de upload TUS para o diretório público. Isso não comprova acesso à pasta privada externa. Deploy Git pode habilitar auto-deploy; não substitui build Expo e não é adequado para publicar o repositório cru. Importação de site inteiro sobrescreve conteúdo e não foi usada.

A consulta da implantação retornou gitAutoDeployment null. Nenhuma transferência, criação de token ou alteração de configuração foi executada. Antes de automatizar: verificar acesso restrito às DUAS pastas, mesclagem sem excluir config.php, transporte seguro, backup, rollback e proteção do domínio principal. Se FTPS for utilizado futuramente, verificar disponibilidade e escopo no painel e guardar credenciais somente em Secrets com ambiente de aprovação, nunca em código. Não pressupor SSH/SFTP no plano atual.

Até essas verificações, usar o pacote validado e o procedimento manual. Pendentes no painel/aparelhos: ensaio do backup real, transferência privada segura, validação LiteSpeed/HTTPS da nova versão e instalação PWA real. A CI remota precisa ser executada explicitamente; nenhum deploy está autorizado por este guia.

## Atualiza??o da central de novidades

Aplicar apenas migrations/20261101_workout_completion.sql antes de publicar o c?digo que consulta conclus?es. A migra??o adiciona WorkoutCompletion, com FK ao treino e unicidade por treino/dia; n?o executar schema.sql na base existente. Ensaiar em banco sint?tico com treinos previamente preenchidos, preservar backup privado e conferir integridade dos registros anteriores.

Publicar News.php e bootstrap antes das classes dependentes, atualizar generated/models.json, Workouts.php, Push.php e App.php. Preservar config.php, chaves, inscri??es e o cron existente, sem duplic?-lo. A central grava IDs de leitura no subdiret?rio storage/push/read, ou pushDirectory/read quando configurado; os arquivos de inscri??es permanecem na raiz. Atualizar o bundle e notifications-sw.js para abrir /?novidades=1 com mensagem gen?rica. Conferir sa?de da API, integridade dos arquivos e sa?da do cron ap?s a publica??o.

## Acesso do aluno pelo WhatsApp e teste em segundo plano

Esta atualiza??o n?o exige DDL: reutiliza Invitation e o armazenamento privado de inscri??es. Publicar Auth.php, Enrollment.php, Push.php e App.php, seguidos pelo bundle web. Preservar configura??o, lista de personals, chaves, inscri??es e cron. A aprova??o abre uma mensagem no WhatsApp do professor para confirma??o do envio, conforme prefer?ncia expl?cita; n?o requer credencial WhatsApp Business. Links individuais e n?meros reais n?o devem entrar no reposit?rio ou em diagn?sticos.

O teste em segundo plano adiciona testAt e lastTestAt ? inscri??o selecionada, sob a mesma trava de arquivo do despachante. O cron existente processa o teste vencido e o remove ap?s aceite do provedor; n?o duplicar o cron e n?o limpar inscri??es para testar. O bot?o local verifica a solicita??o de exibi??o no aparelho; nenhum dos testes garante percep??o pelo usu?rio.
