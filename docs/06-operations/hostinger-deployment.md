---
{
  "id": "ta-pago.docs.06-operations.hostinger-deployment",
  "title": "Publicação do Tá Pago na Hostinger",
  "status": "deprecated",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-29",
  "language": "pt-BR",
  "tags": [
    "06-operations"
  ],
  "indexable": false,
  "sources": [
    "hostinger.mjs",
    "server/runtime.ts",
    "server/index.ts",
    "server/app.ts",
    "deploy/hostinger.env.example",
    "package.json"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.1.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "operations"
}
---

# Publicação do Tá Pago na Hostinger

**Procedimento antigo, destinado ao runtime Node. Não usar no Single Web Hosting.** O destino atual é PHP 8.3/MySQL em `public_html/tapago`; seguir o [guia PHP](php-hostinger-deployment.md). O conteúdo abaixo permanece somente como referência da preparação anterior, não como autorização de deploy, upgrade ou outra hospedagem.

## Destino e estado

Destino solicitado: https://tapago.coletivopindorama.com.br. A preparação está versionada; não implica publicação concluída. Na inspeção inicial, o subdomínio não resolvia no DNS e o acesso disponível era o deploy FTP do site principal, em outro repositório. Ele não oferece, sozinho, a execução da API Node.js. O usuário confirmou que pode conectar o painel/Hostinger Connector; a criação da aplicação, DNS e SSL depende dessa conexão.

Não reutilizar o deploy FTP do site principal para servir apenas dist: login, fichas, aprovações e persistência dependem de Express. Não modificar a raiz do Coletivo Pindorama nem outros subdomínios.

## Aplicação gerenciada

Segundo a [documentação da Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), Express e Node.js 24 são suportados nos planos compatíveis com Web Apps. Confirmar a capacidade da conta pelo painel antes de criar recursos.

- Repositório: mariomoutinho/ta-pago; branch main; raiz do projeto.
- Aplicação: backend Express/Other, Node.js 24. Não selecionar hospedagem somente estática.
- Instalação: npm ci, incluindo dependências de build.
- Build: npm run production:build (Prisma generate e exportação web).
- Entrada Node: hostinger.mjs; comando equivalente: npm run production:start.
- A pasta dist contém somente os assets web; server, shared e dependências permanecem necessários no runtime.
- Inicialização usa PORT do provedor e escuta em 0.0.0.0 em produção.
- GET /api/health retorna 200 se o banco e o schema User estiverem acessíveis; 503 em falha, sem revelar dados.

## Configuração obrigatória

Use deploy/hostinger.env.example como referência para cadastrar variáveis no painel; não coloque valores secretos no Git. Defina NODE_ENV=production, PERSONAL_ENROLLMENT_ORIGIN e PERSONAL_APP_ORIGINS com o destino HTTPS exato. Cookies de sessão são Secure em produção. A web usa a mesma origem; deixe EXPO_PUBLIC_PERSONAL_API_URL ausente.

PERSONAL_DATABASE_URL deve apontar para SQLite em caminho absoluto privado e persistente, fora da pasta da release. Confirmar no provedor permissões, persistência entre deploys e backup; não assumir que public_html, dist ou a pasta temporária do build são armazenamento permanente. Se a hospedagem não oferecer esse volume, escolher VPS/armazenamento compatível antes de publicar.

PERSONAL_ENROLLMENT_KEY deve conter 32 bytes em hexadecimal, armazenados no painel como segredo. Para migrar fichas cifradas existentes, preservar a chave original; trocar a chave torna essas fichas ilegíveis. Não transportar o .env local inteiro: ele também pode conter configuração RAG independente.

PERSONAL_TRUST_PROXY aceita IPs/sub-redes separados por vírgula. Configurar somente após confirmar a topologia e o tratamento dos cabeçalhos pelo proxy, conforme [Express atrás de proxies](https://expressjs.com/en/guide/behind-proxies/). Sem isso, limites de requisição podem agregar usuários no IP do proxy. Não usar confiança irrestrita.

## Banco, migração e publicação

1. Criar a aplicação dedicada e associar tapago.coletivopindorama.com.br. Confirmar registros DNS e emissão de certificado pelo painel.
2. Definir volume privado persistente e variáveis, sem tornar arquivos SQLite ou chave acessíveis por HTTP.
3. Para instalação vazia: npm run production:setup. Esse comando verifica configuração, gera Prisma, aplica migrations e cria somente o modelo de avaliação base.
4. Para levar os dados locais: preparar snapshot consistente do SQLite, transferir por canal autenticado e cifrado e preservar a chave de fichas. Nunca incluir banco, sessões ou chave no pacote de código/Git. Preservar a origem e backup; confirmar o destino antes de importar.
5. Iniciar com NODE_ENV=production e npm run production:start. Verificar /api/health, login, links diretos, cookies Secure, formulário público e isolamento entre profissionais.
6. Criar uma solicitação de teste sem dados reais e confirmar aprovação. Verificar que dados persistem após reiniciar/republicar. Só então considerar a migração concluída.

O código local continua funcionando com personal:start na porta 3003. Nenhum dado local foi migrado para a internet na preparação.

## Verificação local da preparação

production.test.ts executa hostinger.mjs em processo real com SQLite temporário, verifica a API, rota SPA e cookie Secure, além de rejeitar configuração insegura ou banco dentro da release. Isso valida a entrada de produção; não comprova DNS, SSL, permissões ou persistência do provedor.
