---
{
  "id": "ta-pago.docs.06-operations.php-hostinger-deployment",
  "title": "Hostinger Single — implantação PHP em tapago",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-30",
  "language": "pt-BR",
  "tags": [
    "06-operations",
    "php",
    "migration"
  ],
  "indexable": true,
  "sources": [
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
  "version": "2.0.0",
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

## PWA e verificação em aparelhos

O manifesto usa nome Tá Pago, início/escopo / e display standalone. Ícones PNG reais da marca são gerados em 192/512; iOS usa apple-touch-icon 180 e metadados próprios. Não há cache offline ou service worker. A instalação precisa de conexão para consultar dados.

Depois de publicar, no Android abrir o site HTTPS em navegador compatível e usar Instalar aplicativo/Adicionar à tela inicial; no iPhone usar Compartilhar → Adicionar à Tela de Início. Abrir pelo novo ícone e conferir ausência de barra de endereço, login e atualização. A interface varia por navegador/versão. Testar em aparelhos reais: validação automatizada do manifesto em Chromium não comprova instalação nem modo standalone em iOS/Android.

Referências: [critérios de instalação do Edge](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/) e [configuração web app da Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## Transferência automatizada: investigação e pendências

O conector Hostinger oferece geração de URL de upload TUS para o diretório público. Isso não comprova acesso à pasta privada externa. Deploy Git pode habilitar auto-deploy; não substitui build Expo e não é adequado para publicar o repositório cru. Importação de site inteiro sobrescreve conteúdo e não foi usada.

A consulta da implantação retornou gitAutoDeployment null. Nenhuma transferência, criação de token ou alteração de configuração foi executada. Antes de automatizar: verificar acesso restrito às DUAS pastas, mesclagem sem excluir config.php, transporte seguro, backup, rollback e proteção do domínio principal. Se FTPS for utilizado futuramente, verificar disponibilidade e escopo no painel e guardar credenciais somente em Secrets com ambiente de aprovação, nunca em código. Não pressupor SSH/SFTP no plano atual.

Até essas verificações, usar o pacote validado e o procedimento manual. Pendentes no painel/aparelhos: ensaio do backup real, transferência privada segura, validação LiteSpeed/HTTPS da nova versão e instalação PWA real. A CI remota precisa ser executada explicitamente; nenhum deploy está autorizado por este guia.
