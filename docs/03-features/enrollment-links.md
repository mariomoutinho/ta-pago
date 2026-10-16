---
{
  "id": "ta-pago.docs.03-features.enrollment-links",
  "title": "Link de Cadastro de Alunos",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": [
    "server/enrollment.ts",
    "server/enrollment-crypto.ts",
    "shared/enrollment.ts",
    "src/app/alunos/link.tsx",
    "src/app/cadastro/[token].tsx",
    "prisma/schema.prisma"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "proposal",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [],
  "framework_version": null,
  "domain": "teacher-student"
}
---

# Link de Cadastro de Alunos

## Fluxo implementado

Meus alunos → Link de Cadastro apresenta as abas Link e Contatos. O personal informa nome público e contato para privacidade, gera uma URL aleatória, copia, abre o WhatsApp, compartilha ou visualiza o formulário. Desativação interrompe novos envios; gerar novo link invalida o anterior sem apagar fichas.

A página pública `/cadastro/[token]` funciona sem login, em cinco etapas: dados pessoais, objetivos múltiplos, experiência, saúde opcional e revisão com política/consentimento. O cadastro é persistido como pending, sem criar User nem liberar acompanhamento. O formulário não pede exames, não diagnostica e não prescreve.

Contatos oferece busca, filtro, ficha e decisões: pending → active ou rejected; active → inactive. A aprovação cria ou reutiliza Student do mesmo personal pelo e-mail normalizado, sem sobrescrever a ficha anterior. O vínculo de conta continua usando login e convite individual de uso único, exigindo também o e-mail cadastrado. A titularidade depende da entrega desse convite pelo profissional ao titular; não há serviço de verificação automática por e-mail.

Meus alunos exibe ativos, pendentes e recebidos nos últimos sete dias. A lista Contatos usa as mesmas solicitações, sem copiar cadastros. Os contadores/contatos atualizam a cada 15 segundos e ao voltar à tela. Aprovação e recusa têm histórico persistido.

## Persistência e segurança

Migração `20261016131704_enrollment_links`: EnrollmentLink (um por personal), EnrollmentChallenge (prova de preenchimento expirá­vel), EnrollmentRequest (único por personal e impressão HMAC do e-mail) e EnrollmentEvent. Nenhuma tabela existente é removida. Execute `npm run personal:setup` para gerar Prisma e aplicar migrações.

As fichas são cifradas com AES-256-GCM. Saúde fica em payload separado, exige consentimento específico e é removida da solicitação ao encerrar o vínculo. Política, data e consentimento são registrados; caixas começam desmarcadas. Dados cadastrais aprovados usam o Student existente; sua persistência legada não é criptografada por esta mudança. A chave de criptografia deve ser preservada com segurança: perder ou trocar a chave impede ler fichas anteriores e identificar duplicidades.

O token público permite apenas obter nome/contato públicos e enviar ficha. Não permite listar, consultar ou aprovar solicitações. A API exige papel personal e propriedade para consultas privadas e decisões. Respostas públicas não incluem dados enviados nem indicam se um e-mail já existe. A prevenção de automação combina limite de 30 requisições por IP a cada 15 minutos, campo-armadilha e desafio aleatório de uso único, válido por uma hora e com tempo mínimo de dois segundos. Não substitui CAPTCHA dedicado numa exposição pública de grande escala.

Pendentes/recusados expiram após PERSONAL_ENROLLMENT_RETENTION_DAYS sem atualização (padrão 90). Limpeza na inicialização, a cada hora enquanto o servidor estiver ativo e ao listar contatos. Também disponível em `npm run personal:purge-enrollments`. A exclusão manual da solicitação está disponível quando não ativa e preserva o acompanhamento associado; a exclusão de histórico segue o fluxo preexistente. Registros ativos/inativos não são eliminados automaticamente. Solicitações de exclusão de acompanhamento encerrado sem conta vinculada ainda precisam de tratamento administrativo.

## Rotas e endpoints

| Método e rota | Uso |
| --- | --- |
| GET `/api/public/enrollment/:token` | Validar link e emitir desafio; somente metadados públicos. |
| POST `/api/public/enrollment/:token` | Enviar ficha, consentimentos e desafio. |
| GET `/api/enrollment/link` | Consultar link do personal. |
| POST `/api/enrollment/link` | Criar/rotacionar, com publicName e contact. |
| DELETE `/api/enrollment/link` | Desativar link. |
| GET `/api/enrollment/requests` | Listar contatos próprios. |
| GET `/api/enrollment/requests/:id` | Consultar ficha própria. |
| POST `/api/enrollment/requests/:id/status` | Aprovar, recusar ou desativar. |
| DELETE `/api/enrollment/requests/:id` | Excluir solicitação não ativa. |

Interface privada: `/alunos/link`; formulário público: `/cadastro/[token]`. Não há novo sistema de autenticação ou banco paralelo.

## Configuração e teste local

Por solicitação do usuário, o endereço padrão é http://localhost:3003. Não é um link público da internet.

```bash
source ~/.nvm/nvm.sh
nvm use
npm ci
npm run personal:setup
npm run personal:build
npm run personal:start
```

Abra localhost:3003, entre como personal e gere o link em Meus alunos → Link de Cadastro. Abra-o em janela anônima, preencha as cinco etapas e envie. Na conta do personal, consulte Contatos e aprove. O aluno aparece em Meus alunos. Teste a rotação: o endereço antigo deve deixar de aceitar envios.

Para Expo Go, use um aparelho compatível com Expo 57 e a mesma rede. Configure EXPO_PUBLIC_PERSONAL_API_URL e PERSONAL_ENROLLMENT_ORIGIN com o IP real do computador e porta 3003; configure PERSONAL_API_HOST=0.0.0.0 e PERSONAL_APP_ORIGINS com as origens usadas. Inicie `npm run personal:api` e `npm start`, abra pelo QR. O link compartilhado abre a exportação web no navegador, por isso rode personal:build antes. WSL, firewall e roteador precisam permitir acesso do aparelho; localhost do celular não aponta para o computador.

| Variável | Finalidade |
| --- | --- |
| PERSONAL_ENROLLMENT_ORIGIN | Origem completa dos links; padrão local acima. |
| PERSONAL_ENROLLMENT_RETENTION_DAYS | Prazo de 1 a 3650 dias para pendentes/recusados. |
| PERSONAL_ENROLLMENT_KEY | Segredo de 64 caracteres hexadecimais; obrigatório em produção. |
| PERSONAL_ENROLLMENT_KEY_FILE | Arquivo da chave em desenvolvimento; padrão data/enrollment.key, permissão 0600 e ignorado pelo Git. |

Não colocar chave em variável EXPO_PUBLIC. Produção exige domínio HTTPS, proteção do arquivo/banco e backups, gestão da chave, configuração de proxy/limites e revisão operacional da política de privacidade. O modo HTTP local não oferece criptografia de transporte. Não há hospedagem pública nem envio automático de mensagens nesta entrega.

## Verificação

Testes em tests/personal/enrollment.test.ts cobrem autorização, link, formulário, associação, aprovação, duplicidade, criptografia, consentimento, expiração, rate limit e retenção. sharing.test.ts cobre clipboard, WhatsApp, fallback web e chamadas nativas simuladas; Playwright cobre copiar URL e cadastro público real até aprovação. As APIs nativas usam [Expo Clipboard 57](https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/) e Share/Linking do React Native. Testes simulados não comprovam abertura do WhatsApp ou share sheet em aparelhos físicos.
