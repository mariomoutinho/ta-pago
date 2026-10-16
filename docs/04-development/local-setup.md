---
{
  "id": "ta-pago.docs.04-development.local-setup",
  "title": "Ambiente local",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-16",
  "language": "pt-BR",
  "tags": [
    "04-development"
  ],
  "indexable": true,
  "sources": [
    "package.json",
    "scripts/reset-project.js",
    "server/index.ts",
    "server/import-compasso.ts",
    ".nvmrc",
    "server/enrollment.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.1.0",
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
  "domain": "development"
}
---

# Ambiente local

## Executar localmente

Use a versão de Node da `.nvmrc` (24.19.0). Após reiniciar o WSL, execute `source ~/.nvm/nvm.sh` e `nvm use` na pasta do projeto.

```bash
npm ci
npm run personal:setup
npm run personal:build
npm run personal:start
```

Abra http://localhost:3003. O servidor atende a API e a interface compilada na mesma origem. Para desenvolvimento com recarga: `npm run personal:dev`, interface em http://localhost:8081 e API na porta 3003. `npm start` inicia somente o Expo, sem a API.

Na primeira execução, crie uma conta de personal ou aluno. Para migrar o Compasso, faça a importação antes de criar contas no destino:

```bash
npm run personal:import -- --source /caminho/compasso/data/personal.db
```

A origem é aberta somente para leitura. IDs, senha protegida, avaliações e histórico são preservados; sessões não são copiadas. O destino deve estar sem contas, alunos e programas; qualquer conflito aborta a transação. O questionário base criado no setup pode permanecer. A importação nunca envia dados ao GitHub.

Para dispositivos, configure `EXPO_PUBLIC_PERSONAL_API_URL` com uma URL acessível pelo aparelho e inicie a API. Em rede local, configure também `PERSONAL_API_HOST=0.0.0.0` e controle o acesso à rede. Android/iOS precisam de ambiente próprio; a compilação web não comprova funcionamento em dispositivo.

## Validação

Execute `npm run typecheck`, `npm run personal:typecheck`, `npm run personal:test`, `npm run personal:build` e `npm run personal:e2e`. O Playwright requer Chromium instalado (`npx playwright install chromium`). Execute também as validações documentais e do catálogo previstas em AGENTS.md. ESLint ainda não está configurado. Não execute `reset-project` no fluxo normal.

## Cadastro por link

Após atualizar, execute personal:setup e personal:build. O link local usa localhost:3003. Instruções para navegador, Expo Go, IP de rede e chave em [Link de Cadastro de Alunos](../03-features/enrollment-links.md).
