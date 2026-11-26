---
{
  "id": "ta-pago.docs.07-ai.task-professional-studio-layout",
  "title": "Layout profissional Studio e treinos preparados",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": ["07-ai"],
  "indexable": false,
  "sources": [
    "src/components/personal/shell.tsx",
    "src/components/personal/brand.tsx",
    "src/components/personal/enrollment-notifications.tsx",
    "src/components/studio/professional-layout.tsx",
    "src/components/studio/controls.tsx",
    "src/components/studio/icons.tsx",
    "src/components/studio/page-header.tsx",
    "src/components/studio/search-input.tsx",
    "src/components/studio/dropdown-menu.tsx",
    "src/components/studio/workout-template-card.tsx",
    "src/components/workouts/prepared-workouts.tsx",
    "src/constants/studio.ts",
    "src/hooks/use-theme.ts",
    "src/global.css",
    "tests/personal/browser/app.spec.ts",
    "package.json"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
  "authority": "code",
  "audience": ["developer", "ai_agent", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.02-architecture.navigation", "ta-pago.docs.03-features.workouts"],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Layout profissional Studio e treinos preparados

## Escopo e estado inicial

Implementar a proposta [02 — Studio — Painel lateral](https://www.figma.com/design/DFBtR54OnLOiF6qmbxvid0?node-id=1-77), preservando a logo, a identidade preto/vermelho e os fluxos existentes. A revisão inicial era `55ce9e6` na main. As alterações anteriores em `native-android/gradle/wrapper/gradle-wrapper.properties` e os arquivos não rastreados do usuário foram preservados.

O trabalho fica na branch local `feat/professional-studio-layout`. O briefing proíbe push, merge e deploy sem nova autorização. A origem dos metadados permanece na revisão-base real de `knowledge/config.json`; ela não descreve o commit futuro desta tarefa.

## Diagnóstico e decisões

O cabeçalho anterior ficava em `PersonalShell`, as rotas em `PersonalNavigation` e a listagem/seletor de modelos em `PreparedWorkouts`. O app usa React Native, Expo Router e StyleSheet/estilos nativos. A preferência de tema já era persistida por `AppThemeProvider`. `logotapago.png` é a marca original. O cabeçalho compartilhado não deve impor a navegação profissional às contas de aluno.

Foi criado um ramo de apresentação profissional em `PersonalShell`, com contexto de cores próprio, mantendo autenticação e tema existentes. Sidebar e cabeçalho são compartilhados por todas as páginas do personal. `Page` limita a largura do conteúdo profissional a 1120 px. A extração de `Brand` preserva os imports anteriores pelo shell e a imagem original.

Os cinco SVGs fornecidos pelo Figma foram baixados para `assets/studio` e renderizados nos respectivos controles, a 20 × 20 px. Nenhuma URL temporária do Figma é usada no app. Lucide e `react-native-svg` foram adicionados para os outros ícones, usando imports individuais para evitar incluir a biblioteca inteira no bundle. O SVG usa a versão recomendada na documentação do Expo 57.

Os componentes Studio incluem controles de botão, cabeçalho, busca, menu de ações, card e skeleton. Os cards recebem dados reais da API. Criação, edição, exclusão confirmada, cópia, tratamento de erro e acesso às notificações reutilizam os handlers existentes. Não houve alteração de API, banco, sessão, autorização ou permissões.

## Validação

Os testes Studio cobrem navegação pelas sete rotas, rota ativa, recolhimento e persistência, tooltip por foco, drawer e fechamento ao navegar, temas e persistência, notificações, logout e isolamento do layout do aluno. O fluxo de modelos verifica skeleton, busca e contagem, visualização, edição, criação com prescrição e exclusão confirmada. As capturas usam dados sintéticos de um banco SQLite isolado e não acessam alunos reais.

A comparação visual usa o screenshot retornado por `get_design_context` para o nó selecionado. As capturas de revisão em 1440, 1280, 768, 390 e 320 px verificam os dois temas, logo e geometria dos assets, ausência de overflow e ações acessíveis. Movimento reduzido é conferido pela transição desativada na web.

### Resultados locais em 26/11/2026

- `typecheck`, `personal:build`, `docs:validate`, `code:inventory`, `code:check`, `knowledge:build` e `knowledge:check`: aprovados.
- Bateria final Playwright: nove cenários aprovados, abrangendo os três cenários Studio, favoritos, edição na biblioteca em 390/1280 px, vídeo, navegação/gestão de exercícios e prévia de modelos. Os cenários Studio que coletam erros de execução passaram sem registros; o cenário de modelos também verifica erros de console.
- `personal:test`: 134 testes aprovados e um reprovado. O teste de importação tenta executar `node_modules/.bin/prisma` diretamente e retorna `ENOENT` no Windows; o código de importação não foi alterado nesta tarefa.
- `docs:test` e `code:test`: continuam com falhas em criação de links simbólicos (`EPERM`) e no teste de proveniência Git neste ambiente. A validação dos documentos e dos manifestos gerados passou.
- O teste ampliado de notificações avançou pelas ações do feed e pelo registro do worker, mas não confirmou uma notificação do sistema no Chrome headless (`getNotifications()` vazio). O fluxo do sino/feed passou nos cenários Studio; entrega nativa de push requer validação própria.
- Alguns seletores de testes existentes foram tornados específicos para o card e o campo editável, e a navegação de histórico passa a aguardar a URL e a tela antes de recarregar. Não houve alteração das regras do editor para acomodar testes.

As capturas entregues ficam em `data/studio-review`, fora do corpus e do Git: `studio-dark-1440.png`, `studio-light-1440.png`, `studio-dark-390.png`, `studio-light-320.png`, `studio-sidebar-collapsed.png` e `studio-drawer-390.png`, além das outras larguras verificadas. São registros de teste com identidades sintéticas.

## Arquivos e organização da entrega

- `src/components/studio`: layout, sidebar/cabeçalho, controles, ícones, cabeçalho da página, busca, menu contextual, card e skeleton.
- `src/components/personal`: extração da marca e integração do shell e do sino com a área profissional.
- `src/components/workouts/prepared-workouts.tsx`: composição visual com os handlers existentes.
- `src/constants/studio.ts`, `src/hooks/use-theme.ts` e `src/global.css`: tokens, escopo de tema, interação e movimento reduzido.
- `assets/studio`, `package.json` e `package-lock.json`: SVGs locais, Lucide e SVG nativo.
- `tests/personal/browser/app.spec.ts`: cobertura funcional e capturas.
- Documentos de navegação/treinos e catálogos de conhecimento: comportamento observado e evidências atualizadas.

O primeiro commit local é `3a70b4f` (`feat(ui): adiciona estrutura profissional Studio com menu lateral`). Os commits seguintes separam o refinamento da listagem/testes e o registro documental/manifestos; seus hashes finais são informados na entrega da sessão.

## Limites

Na etapa inicial, a entrega permaneceu local. Não foi feita validação em aparelho Android/iOS. A dependência nativa de SVG exige novo build para um binário que ainda não a contenha. O editor de prescrição recebe as cores profissionais e o novo shell; sua estrutura interna não foi redesenhada, pois a referência do Figma e a validação visual desta tarefa são a listagem de treinos preparados e o layout compartilhado.

As falhas de infraestrutura dos testes documentais/inventário no Windows e do teste de importação devem ser relatadas separadamente dos testes do layout. Não reescrever testes para esconder falhas nem alterar infraestrutura fora do escopo.

## Publicação autorizada em 26/11/2026

Após aprovar a prévia local, o responsável autorizou explicitamente push e deploy. Os três commits do Studio foram enviados à branch `feat/professional-studio-layout`, até `7d8e763`, sem merge ou alteração da branch principal.

O build PHP/Web passou na validação do pacote e nos sete testes de empacotamento. A publicação em `https://tapago.coletivopindorama.com.br` atualizou somente arquivos visuais: cinco SVGs Studio, CSS, JavaScript e HTML. A marca original foi preservada. Backend, configuração privada e banco não foram alterados; a conta e os dados da demonstração local não foram publicados. O HTML anterior foi guardado localmente para rollback.

O servidor apresentou uma breve demora para servir arquivos recém-substituídos. A verificação passou após aguardar a propagação, e o cache da hospedagem foi limpo. A conferência final, usando URLs públicas sem parâmetros de cache, confirmou por SHA-256 os oito arquivos do Studio. `/entrar`, `/treinos-preparados` e `/api/health` retornaram HTTP 200; a saúde retornou `status: ok`. O bundle publicado é `entry-48d059b9719d1416ebe16c6dc90e5cd6.js`. Essa conferência não representa um novo teste autenticado com dados reais em produção.
