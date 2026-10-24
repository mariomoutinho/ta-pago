---
{
  "id": "ta-pago.docs.07-ai.task-workout-runtime-fix",
  "title": "Entrega — editor real e gestão de grupos",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-10-24",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "server/app.ts",
    "shared/workout-groups.ts",
    "src/components/workouts/workout-exercise-list.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/plan-form.tsx",
    "src/components/workouts/plans.tsx",
    "src/components/workouts/prescription-form.tsx",
    "tests/personal/browser/app.spec.ts",
    "tests/personal/workout-groups.test.ts",
    "eslint.config.js",
    "package.json"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": [
    "developer",
    "ai_agent",
    "reviewer"
  ],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": [
    "ta-pago.docs.03-features.workouts"
  ],
  "framework_version": null,
  "domain": "workouts"
}
---

# Entrega — editor real e gestão de grupos

## A. Diagnóstico

O localhost:3003 informado pelo usuário era um encaminhamento WSL. O processo atendia a partir de /home/mario/ta-pago, enquanto as correções anteriores e o build foram feitos em E:/ta-pago. O JavaScript entregue pelo servidor era antigo e não continha os controles. Validar outra instância não demonstrava a atualização da janela utilizada. A correção entrega o mesmo editor compartilhado na janela Ver exercícios do Personal e prepara uma release isolada para o servidor efetivo, preservando as alterações não commitadas do checkout WSL.

## B. Arquivos modificados

- shared/workout-groups.ts: seleção parcial, ordem interna, mover/adicionar/retirar membros e separação.
- src/components/workouts/workout-exercise-list.tsx: barra contextual, seleção estável, menus, duplicação e membros ordenáveis.
- src/components/workouts/workout-window.tsx: edição direta, persistência otimista e operações na janela efetivamente usada.
- src/components/workouts/workout-editor.tsx: biblioteca direcionada ao grupo e integração com ações existentes.
- src/components/workouts/plan-form.tsx e plans.tsx: encaminhamento do grupo ao formulário existente.
- src/components/workouts/prescription-form.tsx: aguarda o salvamento e conserva erros no formulário.
- server/app.ts: marcador opcional de release e HTML sem cache.
- tests/personal/workout-groups.test.ts: invariantes de identidade, ordem e membresia.
- tests/personal/browser/app.spec.ts: cenário adicional completo de gestão interna e regressões existentes.
- eslint.config.js, package.json e package-lock.json: configuração reproduzível do lint; regras novas para fluxos legados indicados permanecem avisos.
- docs/03-features/workouts.md e este relatório: comportamento e operação observados.
- knowledge/code-inventory.json, knowledge/code-manifest.json e knowledge/manifest.json: artefatos determinísticos regenerados, sem alteração da revisão-base.

## C. Banco de dados

Esta correção não cria outra migração. Utiliza 20261023180000_workout_editor e 20261024120000_workout_groups já versionadas. O comando é npx prisma migrate deploy, com PERSONAL_DATABASE_URL apontando ao banco existente. Não executar seed sobre o ambiente real. A ativação local exige backup SQLite consistente, comparação das contagens existentes e integrity_check antes de substituir somente o processo identificado do servidor.

## D. Validação

Passaram: typecheck e personal:typecheck; 87 testes de API/domínio/migração/produção; 33 testes documentais; 20 testes de extração de código; 13 cenários Playwright; build web; docs:validate, code:check e knowledge:check. Lint passou com zero erros e 18 avisos herdados, explicitados na configuração. Um teste de SPA identificou que sendFile absoluto recusava o diretório oculto da release; o fallback passou a resolver index.html dentro da raiz dist explícita e a suíte completa passou na repetição.

A release editor-final-1792836215434 foi ativada no WSL e o health do localhost:3003 retornou HTTP 200 com o marcador correspondente. Backup: /home/mario/ta-pago/.rag/editor-backup-1792836917586.db. As migrações existentes foram aplicadas ao banco original, com as contagens preservadas e integrity_check ok. O teste Chromium contra localhost:3003 percorreu o perfil fictício, abriu Ver exercícios, marcou dois itens, confirmou a barra Combinar/Excluir, combinou, arrastou e recarregou. IDs, cargas, agrupamento e ordem foram conferidos na API após a recarga, sem erros JavaScript. As capturas desktop/mobile foram abertas e inspecionadas: test-results/editor-live-selection.png, editor-live-desktop.png e editor-live-mobile.png. A conta fictícia foi removida depois, com contagens de todas as tabelas existentes iguais ao backup. O checkout WSL original permaneceu inalterado. A ferramenta de navegador conectada não disponibilizou nenhuma instância; a alternativa é Chromium automatizado por Playwright, com contas e alunos fictícios, sem modificar prescrições reais do usuário. Testes físicos Android/iOS e CI remota não são inferidos desta execução.

## E. Execução

Use Node 24.19.0. Para reproduzir em um checkout: npm ci, npx prisma generate, npm run personal:build e npm run personal:start, com as mesmas variáveis de ambiente e PERSONAL_DATABASE_URL absoluto do ambiente desejado. A porta do servidor deve ser configurada para 3003. Não iniciar outro checkout sobre a mesma porta. No ambiente do usuário, a release isolada e o caminho do backup ficam registrados em .rag/editor-release-state.json local e fora do Git; o checkout WSL original permanece preservado.


Para reiniciar a release local já instalada, quando a porta estiver livre, execute no WSL:

```bash
cd /home/mario/ta-pago/.rag/releases/editor-final-1792836215434
source /home/mario/.nvm/nvm.sh
nvm use 24.19.0
DOTENV_CONFIG_PATH=/home/mario/ta-pago/.env PERSONAL_DATABASE_URL=file:/home/mario/ta-pago/data/tapago.db npm run personal:start
```

A release já está em execução; não é necessário iniciar outra instância. Recarregar o endereço habitual entrega o HTML atualizado com Cache-Control: no-store. A validação utilizou o mesmo endereço e fluxo com dados fictícios; não alterou nem executou ações sobre o aluno real indicado pelo usuário.
