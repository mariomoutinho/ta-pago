---
{
  "id": "ta-pago.docs.06-operations.hostinger-consolidation",
  "title": "Consolidação Hostinger — raiz do subdomínio e PWA",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-30",
  "language": "pt-BR",
  "tags": ["06-operations", "php", "deployment", "testing"],
  "indexable": true,
  "sources": ["scripts/php/build.mjs", "scripts/php/pwa.mjs", "scripts/php/archive.mjs", "scripts/php/validate-release.mjs", "scripts/php/release.test.mjs", "scripts/php/browser-test.mjs", "scripts/php/apache-test.mjs", "scripts/php/test.mjs", "backend-php/config.example.php", "backend-php/public/.htaccess", "backend-php/public/api/index.php", "backend-php/bootstrap.php", "app.config.ts", "src/features/personal/api.ts", ".github/workflows/php-validation.yml", "package.json", "package-lock.json"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "operations", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.06-operations.php-hostinger-deployment", "ta-pago.docs.06-operations.php-migration"],
  "framework_version": "Expo 57; PHP 8.3; MySQL 8; MariaDB 10.4",
  "domain": "testing"
}
---

# Consolidação Hostinger — raiz do subdomínio e PWA

## Objetivo e escopo

Reproduzir pelo código as correções feitas manualmente na instalação PHP/MySQL existente, acrescentar PWA sem cache offline e preparar atualização verificável com backup/rollback. O subdomínio usa a raiz `/`; `public_html/tapago` é apenas o caminho físico. Preservar frontend Expo/React Native, funções do Personal, banco e configuração privada. Nenhum deploy, alteração de dados remotos, contratação ou ativação de publicação automática faz parte desta entrega.

## Evidências iniciais

Branch `main`, origem `mariomoutinho/ta-pago`, revisão inicial `16734423b009acfd5bb062429cb465c95bb82d09`. Metadado de imagem não rastreado preexistente preservado. A revisão dos metadados documentais permanece a base real de `knowledge/config.json`, não um SHA futuro.

O responsável informou instalação funcional, remoção manual de prefixos em HTML/JS, `RewriteBase /`, `DirectoryIndex index.html index.php`, `basePath` vazio e habilitação de sodium. A consulta somente leitura da Hostinger confirmou document root no subdomínio e `gitAutoDeployment: null`. O HTML remoto usa assets na raiz; o front controller remoto coincide com o código-fonte. A leitura remota de `.htaccess` retornou erro do conector; sua configuração foi consolidada a partir do relato e validada localmente. Não foi feita auditoria integral do código privado remoto, nem leitura do config.php real.

## Decisões e arquivos alterados

| Arquivos | Alteração e finalidade |
| --- | --- |
| scripts/php/build.mjs | Força base web vazia/API mesma origem no build Hostinger; mantém destino físico; inclui somente runtime privado, sem instalador/schema/configuração |
| backend-php/public/.htaccess | Raiz, índices, encaminhamento API, fallback SPA, 404 para assets ausentes, bloqueio de PHP/configurações privados, MIME de manifesto e no-store no HTML/manifesto |
| backend-php/config.example.php | Exemplo de basePath vazio; permanece fora do pacote de atualização |
| scripts/php/pwa.mjs | Gera manifesto e ícones da logo real; metadados iOS/Android e idioma pt-BR; nenhum service worker |
| scripts/php/archive.mjs | Gera ZIP, descompacta e verifica os hashes; grava checksum SHA-256 |
| scripts/php/validate-release.mjs | Lista positiva de arquivos, integridade, referências de assets, rejeição de prefixo antigo/configuração/SQL e validação PWA |
| scripts/php/release.test.mjs | Regressões de configuração, SQL, corrupção, prefixo antigo e início PWA incorreto |
| scripts/php/test.mjs; backend-php/tests/setup.php; backend-php/tests/router.php | Suíte sintética na raiz; roteador local serve o pacote real e tipos de conteúdo |
| scripts/php/browser-test.mjs | Login/sessão/logout, rotas e assets, aluno/treino persistindo após recarga e manifesto no Chromium |
| scripts/php/apache-test.mjs | Testa .htaccess real e resolução da pasta privada com Apache/FastCGI isolado |
| package.json; package-lock.json | Comandos de validação e dependência de imagem de build fixada na versão já utilizada pelo Expo |
| .github/workflows/php-validation.yml | Workflow manual entrega ZIP/checksum após testes; não publica |
| README.md; php-hostinger-deployment.md; php-migration.md; este relatório | Guia de atualização/rollback e distinção entre migração histórica e instalação existente |
| knowledge/manifest.json | Catálogo documental regenerado; sem dados privados |

`app.config.ts`, `src/features/personal/api.ts`, o front controller e bootstrap PHP foram revisados e preservados. O cliente já aceita `/` como base configurada, produzindo `/api/*`; Expo Router já aceita base vazia. A configuração específica é aplicada somente na exportação PHP. Não houve mudança de lógica de autenticação, permissões, tabelas ou regras de alunos/treinos/avaliações.

## Testes executados localmente

Ambiente: Node 24.19.0, PHP 8.3.36, MariaDB 10.4.32 isolado, Apache local e Edge/Chromium headless. A CI está configurada para MySQL 8, mas sua execução remota ainda não foi comprovada nesta entrega.

| Verificação | Resultado e limite |
| --- | --- |
| php:lint | 16 arquivos PHP válidos |
| php:test | 82 verificações HTTP passaram: autenticação, permissões, alunos, publicação, séries/presets, avaliações, histórico e cadastro público |
| Migração sintética incluída em php:test | Origem intacta, importação PDO/SQL, comparação de 20 tabelas, rollback de FK e rejeição de repetição/corrupção passaram; nenhum banco real utilizado |
| php:build, duas execuções | Mesmos inventários e hashes dos arquivos, inclusive com variáveis externas antigas /tapago; ZIP validado por extração. Os bytes do ZIP podem variar por timestamp/compactador |
| php:package-check | 41 arquivos mais inventário, base pública vazia, ícones 180/192/512 válidos; configuração e SQL ausentes |
| php:package-test | 6/6 passaram; pacote real aceito, casos indevidos rejeitados |
| php:browser | 390/1280 px: raiz abre login em /entrar; login/logout e cookie com path /; rota protegida e recarga; 28 arquivos públicos com hash correto; API JSON; nenhum erro JS/HTTP durante navegação |
| Aluno/treino após recarga | Criados pela API usando sessão do navegador, publicados e exibidos na tela do professor antes/depois de recarregar; persistência conferida por nova consulta ao banco sintético |
| Apache/FastCGI | Mesma suíte passou com .htaccess real e diretório privado resolvido pelo pacote; arquivos proibidos 403 e asset inexistente 404 intencionais |
| PWA | Manifesto aceito pelo Chromium, MIME correto, metadados Apple e ícones válidos; zero registros de service worker e caches no contexto novo; ícone gerado inspecionado |
| typecheck | Passou |
| docs:validate; code:inventory; code:check; knowledge:build; knowledge:check | Passaram; 51 documentos válidos, 1841 entidades, 1615 relações e 3492 chunks no catálogo consolidado |
| docs:test | 31 passaram, 2 falharam por EPERM ao criar links simbólicos no Windows |
| code:test | 17 passaram, 3 falharam: 2 EPERM de links simbólicos e 1 Missing expected exception em proveniência Git |

As cinco falhas do catálogo já haviam sido reproduzidas antes das alterações atuais, em arquivos não modificados por esta tarefa. Não foram suprimidas nem contabilizadas como sucesso. Os testes locais não comprovam instalação em dispositivos reais, TLS/cookie Secure em produção ou todos os fluxos de interface ponta a ponta. Cadastro/publicação têm cobertura HTTP; o teste de persistência não preenche seus formulários visuais.

O teste Apache inicialmente precisou de ajuste no harness FastCGI para o caminho de arquivo Windows; o erro de resolução foi corrigido sem alterar a API. A inspeção do ZIP identificou barras invertidas produzidas pelo .NET Framework; o gerador passou a normalizar e verificar os caminhos internos com `/`, compatíveis com extração Linux, carregando explicitamente os assemblies necessários. As tentativas iniciais de registrar a dependência de imagem falharam por cache npm indisponível/permissão; a instalação com cache local ignorado pelo Git concluiu, preservando a versão 0.11.4.

## Atualização e pendências

Gerar com `npm run php:build`; consultar `data/php-last-archive.txt`. O [guia de implantação](php-hostinger-deployment.md) descreve conferência SHA-256, backup privado, cópia seletiva para as duas pastas, preservação de config.php/MySQL e rollback de arquivos. Não executar novamente schema.sql nem importação inicial.

Permanecem pendentes: execução explícita da CI MySQL 8 no GitHub; correção/validação das falhas gerais do catálogo em ambiente compatível; ensaio do backup real; validação da nova versão em LiteSpeed/HTTPS quando houver autorização de publicação; instalação e abertura standalone em Android/iPhone físicos. Não houve teste de aplicativo nativo nesta entrega.

A investigação do conector encontrou upload TUS limitado ao diretório público, sem comprovar acesso à pasta privada externa. Transferência automatizada não foi habilitada. Precisa primeiro comprovar escopo, permissões, proteção do config.php e rollback, usando a hospedagem existente. Nenhum token de upload foi solicitado.

## Conhecimento e entrega

Documentação em pt-BR, IDs e revisão-base preservados. Inventário e catálogo devem ser regenerados e conferidos junto ao código, sem indexar dados de alunos, configs ou backups. Commit/push não equivalem a deploy; a publicação PHP continua manual. O resultado de Git e das validações documentais é informado na entrega final.
