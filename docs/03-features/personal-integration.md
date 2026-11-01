---
{
  "id": "ta-pago.docs.03-features.personal-integration",
  "title": "Módulo Personal integrado",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-01",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": [
    "server/app.ts",
    "server/import-compasso.ts",
    "prisma/schema.prisma",
    "shared/questionnaire.ts",
    "src/components/personal/profile.tsx",
    "src/app/entrar.tsx",
    "src/components/personal/welcome-carousel.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.2.0",
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

# Módulo Personal integrado

O acompanhamento Compasso foi incorporado ao aplicativo Expo Tá Pago com componentes compartilhados, logo TP e cores preto, branco e vermelho. Não depende de iframe nem de manter o aplicativo anterior aberto.

## Funcionalidades

Personal: alunos com saúde opcional, programas, modelos versionados, avaliação inicial com 33 perguntas, 13 critérios técnicos, registros mensais/físicos/de treino/sociais e notas. Sete abas organizam perfil, avaliações, evolução, treinamento, critérios técnicos, adaptação social e histórico. Gráficos usam valores numéricos registrados; critérios qualitativos não recebem notas inventadas. Avaliações concluídas são imutáveis, e correções de registros preservam valores anteriores no histórico.

Aluno: aceita convite de uso único, consulta seu acompanhamento, preenche respostas de avaliações em rascunho, exporta seus dados e encerra o vínculo. O encerramento remove o acesso do personal, mas mantém o histórico disponível ao aluno. O personal não pode excluir um cadastro já vinculado; a exclusão definitiva pertence à conta do aluno. Antes de vincular, o cadastro é gerido pelo personal.

## Apresentação na entrada

A tela de entrada substitui o bloco promocional estático por um carrossel com três mensagens: presença e conquistas; alunos, treinos e avaliações; evolução além dos números. Os destaques “33 perguntas”, “13 critérios técnicos” e “Histórico preservado” foram removidos somente dessa apresentação.

O carrossel avança lateralmente a cada 2 segundos, permite deslizar e selecionar uma mensagem pelos indicadores. Interação manual pausa a reprodução; o botão permite retomá-la. A preferência de movimento reduzido desativa o avanço automático e as animações, mantendo a seleção manual. O temporizador fica suspenso quando o aplicativo sai do primeiro plano. A implementação é compartilhada entre web e plataformas nativas; aparelhos físicos ainda precisam de validação.

A apresentação tem altura menor. Em celulares, marca, margens e cartão de login são compactados para deixar o acesso completo visível na tela inicial, sem teclado aberto. Em áreas visíveis menores que 740 px de altura, o carrossel prioriza os títulos; abaixo de 620 px, omite também o destaque superior e reduz espaçamentos. A página permanece rolável para cadastro, teclado aberto e tamanhos de fonte ampliados.

O ajuste compacto foi verificado localmente em 320 × 568, 360 × 640, 390 × 740 e 1280 × 900, com todos os campos e os botões Entrar e Criar minha conta dentro da área visível inicial. Os mesmos cenários verificaram troca automática lateral, seleção, pausa, retomada e abertura do cadastro; o cenário com movimento reduzido preservou a seleção manual.

Validação local em 01/11/2026: navegador Chromium/Edge em 390 e 1280 px verificou avanço automático, seleção, pausa, retomada, ausência dos três destaques, abertura do cadastro e ausência de erros JavaScript. Em 320 px, verificou movimento reduzido, seleção manual e ausência de rolagem horizontal na página. Typecheck, build PHP/web e os seis testes de empacotamento passaram. As suítes documentais e de extração repetiram as cinco falhas já registradas no [relatório de evolução](../06-operations/relatorio-evolucao-2026-10-27.md), relacionadas a links simbólicos no Windows e proveniência.

## Persistência e operação

SQLite local em data/tapago.db, ignorado pelo Git, separado do banco RAG. O arquivo não possui criptografia de conteúdo: acesso ao sistema operacional e backups precisam ser controlados. Não enviar prontuários, exportações nem credenciais ao catálogo de conhecimento.

Use personal:setup para migrações e seed idempotente, personal:build e personal:start para servir em localhost:3003. Leia [ambiente local](../04-development/local-setup.md) para importar o banco anterior sem alterar a origem. O login anterior é mantido após a importação; sessões exigem novo login.

## Configuração

PERSONAL_DATABASE_URL define SQLite; PERSONAL_API_PORT e PERSONAL_API_HOST definem escuta. PERSONAL_APP_ORIGINS lista origens web permitidas, separadas por vírgula. EXPO_PUBLIC_PERSONAL_API_URL define endereço público da API para dispositivo; jamais coloque segredo em variável EXPO_PUBLIC. COOKIE_SECURE=true é necessário ao operar com HTTPS. Produção exige configuração própria de HTTPS, backup, operação e validação em dispositivos. Não há deploy público nesta entrega.
