---
{
  "id": "ta-pago.docs.07-ai.task-workout-catalog-folders",
  "title": "Catálogo de treinos, pastas e presets",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "prisma/schema.prisma",
    "shared/workouts.ts",
    "server/workout-templates.ts",
    "server/workouts.ts",
    "backend-php/src/App.php",
    "backend-php/src/Workouts.php",
    "src/components/workouts/prepared-workouts.tsx",
    "src/components/workouts/preset-library.tsx",
    "src/components/studio/dropdown-menu.tsx",
    "src/components/studio/professional-layout.tsx",
    "tests/personal/workout-templates.test.ts",
    "tests/personal/browser/app.spec.ts"
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
    "ta-pago.docs.02-architecture.navigation",
    "ta-pago.docs.03-features.workouts"
  ],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Catálogo de treinos, pastas e presets

## Escopo e decisões

Pedido: implementar Clonar, Duplicar, Trocar de pasta e Excluir no menu do treino; criar pastas; renomear a seção para Catálogo de treinos; adicionar Presets à barra lateral. A branch inicial é feat/professional-studio-layout, sobre 48ca988. As alterações preexistentes de Gradle e arquivos pessoais não fazem parte desta entrega.

Duplicar cria uma cópia independente na mesma pasta; Clonar abre uma cópia no editor e só a grava após Salvar. A cópia não carrega a identidade dos itens do modelo original. A edição normal mantém os identificadores para preservar a reordenação. O endereço /treinos-preparados continua compatível.

WorkoutFolder pertence ao professor; WorkoutTemplate recebe folderId opcional. As migrações SQLite e PHP/MySQL são aditivas. A exclusão de pasta deixa seus treinos sem pasta, sem excluir modelos ou prescrições. A interface cria e abre pastas, mostra Todos e Sem pasta, e move modelos com revisão para impedir gravação obsoleta. As APIs incluem renomear e excluir pastas e validam propriedade. O aluno não pode acessar essas rotas.

A página /presets permite busca e CRUD dos presets privados. Os padrões podem ser personalizados como cópia. O editor reutiliza SeriesEditor; suas ferramentas internas de salvar/carregar outro preset são ocultadas nessa página para evitar ações duplicadas. As configurações adicionais são preservadas; exclusão ou edição de preset não modifica prescrições já salvas. O campo JSON nulo no Prisma usa o marcador público DbNull do runtime.

## Validação e limites

Os 28 testes de API/modelos passaram, cobrindo modelos vazios, catálogo de exercícios, pastas, mudança com revisão, cópias independentes, acesso de terceiros/alunos e CRUD de presets. A bateria de navegador verificou menu lateral, temas e larguras, criação e edição de modelos, cadastro simplificado de exercícios, importação do catálogo e os novos fluxos de pastas e presets. TypeScript, sintaxe PHP 8.3 e o contrato PHP foram verificados. A suíte completa PHP/MySQL depende do banco sintético da porta 33316, indisponível neste ambiente; não houve teste autenticado em produção.

O primeiro ensaio visual identificou um rótulo antigo no skeleton; a renomeação foi aplicada ao restante dos pontos de entrada e o ensaio passou. Uma importação direta do cliente Prisma gerado não era compatível com a transformação do Playwright; DbNull passou a ser importado do runtime da dependência, e os testes puderam executar sem alterar a configuração do runner.

A prévia local usa banco sintético separado de produção. A migração foi aplicada somente a esse banco. Nenhuma publicação foi autorizada para este escopo; nenhuma migração, conta ou dado de produção foi alterado. Para publicar depois, é necessário backup e aplicação controlada da migração PHP antes do novo backend/cliente. Os testes documentais e de código neste Windows mantêm as limitações de links simbólicos/proveniência registradas anteriormente; os checks determinísticos são executados separadamente.

Resultados finais: 28 testes de API, quatro cenários Playwright e sete testes de empacotamento aprovados. O cenário novo inclui personalização de um preset padrão e os quatro itens do menu em 390 px. A captura móvel foi inspecionada visualmente. `docs:validate`, `code:inventory`, `code:check`, `knowledge:build`, `knowledge:check`, `typecheck`, build web e build/validação do pacote PHP passaram. `docs:test` apresentou duas falhas de links simbólicos; `code:test` apresentou duas falhas de links simbólicos e a falha de proveniência Git, já observadas neste ambiente. As rotas locais de pastas e `/presets` foram conferidas após reiniciar a prévia; a saúde retornou `ok`.
