---
{
  "id": "ta-pago.docs.03-features.personal-integration",
  "title": "Módulo Personal integrado",
  "status": "proposed",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-02",
  "language": "pt-BR",
  "tags": [
    "03-features"
  ],
  "indexable": true,
  "sources": [
    "shared/password.ts",
    "tests/personal/password-policy.test.ts",
    "src/app/notificacao.tsx",
    "backend-php/src/AndroidPush.php",
    "server/android-push.ts",
    "src/features/personal/android-push.web.ts",
    "tests/personal/notification-worker.test.ts",
    "server/student-access.ts",
    "src/app/ativar.tsx",
    "src/features/personal/whatsapp-window.ts",
    "src/features/personal/whatsapp-window.web.ts",
    "src/features/personal/enrollment-sharing.ts",
    "tests/personal/student-access.test.ts",
    "backend-php/src/Enrollment.php",
    "src/components/personal/shell.tsx",
    "backend-php/src/News.php",
    "server/news.ts",
    "shared/notifications.ts",
    "src/app/alunos/cadastros.tsx",
    "src/app/alunos/link.tsx",
    "src/app/_layout.tsx",
    "backend-php/src/Push.php",
    "backend-php/src/PushCron.php",
    "backend-php/public/notifications-sw.js",
    "server/push.ts",
    "src/components/personal/enrollment-notifications.tsx",
    "src/features/personal/push-device.web.ts",
    "tests/personal/push.test.ts",
    "backend-php/tests/push.php",
    "src/app/cadastro/[token].tsx",
    "server/app.ts",
    "server/import-compasso.ts",
    "prisma/schema.prisma",
    "shared/questionnaire.ts",
    "src/components/personal/profile.tsx",
    "src/app/entrar.tsx",
    "src/components/personal/welcome-carousel.tsx",
    "backend-php/src/Auth.php",
    "backend-php/config.example.php",
    "tests/personal/auth-policy.test.ts",
    "tests/personal/browser/app.spec.ts",
    "src/components/personal/dashboard.tsx",
    "src/components/personal/formatted-field.tsx",
    "src/features/personal/input-format.ts",
    "src/components/personal/forms.tsx",
    "tests/personal/input-format.test.ts"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "4.13.0",
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

## Formatos no cadastro de alunos

As datas do cadastro e da edição aparecem em DD/MM/AAAA, com máscara automática e placeholder `__/__/____`. Datas já preenchidas são apresentadas no formato brasileiro; datas completas voltam ao formato ISO somente no estado enviado aos schemas e à API. Datas incompletas ou impossíveis continuam inválidas, sem correção automática de dia/mês. Campos opcionais vazios permanecem opcionais.

O telefone mostra o placeholder `(__) _ ____ ____`, insere DDD e separadores durante a digitação e usa teclado telefônico. Celulares são apresentados como `(11) 9 1234 5678`; telefones fixos com oito dígitos também são aceitos. A colagem de número brasileiro com +55 é normalizada. Números internacionais legados não são truncados apenas pela exibição; novas edições seguem a máscara brasileira. A ficha pública pelo link usa os mesmos componentes e mantém a apresentação brasileira na revisão.

Validação em 01/11/2026: seis testes de formatação verificam colagem, valores parciais, limpeza, datas ISO existentes, calendário/ano bissexto, campos opcionais e telefones. Dois cenários de navegador verificam cadastro manual, correção de data inválida, payload ISO, reabertura para edição e o fluxo público completo com revisão, envio e aprovação. Typecheck e os seis testes do pacote passaram. As suítes documentais e de extração mantiveram as cinco falhas anteriores de links simbólicos/proveniência registradas no [relatório de evolução](../06-operations/relatorio-evolucao-2026-10-27.md). Aparelhos físicos não foram testados.

## Painel do personal

Em Seus alunos, os atalhos Adicionar aluno e Link de cadastro têm altura mínima de 64 px, com ícone ao lado do texto. Os atalhos de Treinos preservam seu tamanho. O cartão Meus alunos mantém as contagens de ativos, pausados e inativos e a navegação para a lista; seu fundo usa degradê do cinza escuro para vermelho e rosa, com texto branco. O quadro de orientação “Adicione seu primeiro aluno ou compartilhe seu link de cadastro” não aparece mais no painel. O estado vazio da página de alunos permanece independente.

Conferência local com dados sintéticos em 320, 390 e 1280 px, incluindo temas claro e escuro: altura dos atalhos, degradê renderizado, contagens, ausência do aviso, diálogo de cadastro e destinos dos cartões foram verificados. A verificação visual não acessou contas ou dados reais de alunos; aparelhos físicos não foram testados.

## Autorização de contas de personal

O cadastro público cria somente contas de aluno. A interface não oferece o perfil personal; PHP e Express recusam requisições com esse papel com HTTP 403 antes de criar conta ou sessão. Dados enviados pelo cliente, como nome, ID ou supostas aprovações, não concedem autorização.

Contas existentes de personal precisam constar em uma lista de IDs autorizados no servidor: `authorizedPersonalIds` no config.php privado do PHP, ou `PERSONAL_AUTHORIZED_IDS` no Express, com IDs separados por vírgula. Lista ausente ou vazia bloqueia todos os personals. Login e cada leitura de sessão verificam essa política, inclusive para tokens nativos e sessões anteriores à restrição. Contas, alunos e treinos não são excluídos nem convertidos ao restringir o acesso.

A instalação atual mantém um único ID autorizado, definido pelo responsável e conferido na conta existente. A identidade real permanece somente na configuração privada, fora do repositório e do catálogo. Não existe painel de aprovação nesta entrega: novas autorizações exigem decisão do responsável e atualização restrita da lista no servidor. Se uma conta de aluno precisar atuar como personal, a mudança de papel também deve ocorrer por operação administrativa autorizada, nunca pelo cadastro público. No Express, reiniciar o servidor após alterar a variável.

Validação: cinco testes de política com SQLite real cobrem cadastro forjado, cadastro de aluno, personal autorizado, outra conta com o mesmo nome e revogação de sessões/cookies/tokens existentes. A suíte PHP verifica os mesmos bloqueios e preserva as operações de alunos e treinos. As fixtures de personal passaram a ser provisionadas diretamente no banco sintético; não usam mais cadastro público de personal. Dois testes de navegador verificam cadastro de aluno sem opção personal e edição da biblioteca por um personal autorizado.

Execução em 01/11/2026: 85 verificações HTTP PHP e migração sintética passaram; a suíte Personal teve 96 testes aprovados e uma falha anterior em import.test.ts ao executar o launcher Prisma no Windows. Os dois cenários de navegador e as verificações de tipos passaram. As suítes documentais e de extração mantiveram as cinco falhas anteriores de links simbólicos/proveniência já descritas no [relatório de evolução](../06-operations/relatorio-evolucao-2026-10-27.md). A publicação foi conferida por bloqueio HTTP 403 do cadastro de personal, integridade do bundle, saúde da API e preservação do manifesto PWA. Não foi executado login com a senha real do responsável nem teste em aparelho físico.

## Apresentação na entrada

A tela de entrada substitui o bloco promocional estático por um carrossel com três mensagens: presença e conquistas; alunos, treinos e avaliações; evolução além dos números. Os destaques “33 perguntas”, “13 critérios técnicos” e “Histórico preservado” foram removidos somente dessa apresentação.

O carrossel avança lateralmente de forma automática a cada 3 segundos, com transição de 650 ms controlada por Animated, sem depender da rolagem suave do navegador. Não exibe botões Reproduzir/Pausar nem exige ativação, inclusive quando o sistema informa movimento reduzido, conforme preferência explícita do responsável pelo aplicativo. Permite deslizar e selecionar uma mensagem pelos indicadores; essas interações não interrompem o avanço automático. O temporizador fica suspenso quando o aplicativo sai do primeiro plano. A implementação é compartilhada entre web e plataformas nativas; aparelhos físicos ainda precisam de validação.

A apresentação tem altura menor. Em celulares, marca, margens e cartão de login são compactados para deixar o acesso completo visível na tela inicial, sem teclado aberto. Em áreas visíveis menores que 740 px de altura, o carrossel prioriza os títulos; abaixo de 620 px, omite também o destaque superior e reduz espaçamentos. A página permanece rolável para cadastro, teclado aberto e tamanhos de fonte ampliados.

O ajuste compacto foi verificado localmente em 320 × 568, 360 × 640, 390 × 740 e 1280 × 900, com todos os campos e os botões Entrar e Criar minha conta dentro da área visível inicial. Os mesmos cenários verificaram troca automática lateral, seleção, pausa, retomada e abertura do cadastro; o cenário com movimento reduzido preservou a seleção manual.

A correção anterior de movimento foi verificada em 320 × 568, 360 × 640 e 1280 × 900: três transições consecutivas apresentaram deslocamento intermediário e posição final correta, incluindo o retorno à primeira mensagem. A atualização seguinte removeu os controles de reprodução e alterou o intervalo para 3 segundos por solicitação do responsável.

A reprodução automática sem controles foi verificada em 320 × 568, 390 × 740 e 1280 × 900, inclusive com movimento reduzido informado pelo sistema: avanço em 3 segundos sem ativação, deslocamento lateral intermediário, ciclo completo, continuidade após seleção manual, ausência dos botões e login inteiro visível.

Validação local em 01/11/2026: navegador Chromium/Edge em 390 e 1280 px verificou avanço automático, seleção, pausa, retomada, ausência dos três destaques, abertura do cadastro e ausência de erros JavaScript. Em 320 px, verificou movimento reduzido, seleção manual e ausência de rolagem horizontal na página. Typecheck, build PHP/web e os seis testes de empacotamento passaram. As suítes documentais e de extração repetiram as cinco falhas já registradas no [relatório de evolução](../06-operations/relatorio-evolucao-2026-10-27.md), relacionadas a links simbólicos no Windows e proveniência.

## Central de novidades do personal

Em celulares, o sino fica na mesma linha da marca T? Pago, no canto superior direito, respeitando o padding horizontal de 18 px do cabe?alho. Tema e sa?da ficam na linha abaixo. Em telas maiores, o sino ? o ?ltimo controle ? direita.

O sino no cabe?alho abre uma janela com as 100 novidades mais recentes, limitadas a 90 dias ou ? reten??o configurada, se menor. Inclui cadastros enviados, conclus?es de treino e feedbacks. Um c?rculo vermelho sinaliza itens n?o lidos. GET /notifications/summary atualiza a quantidade a cada 15 segundos enquanto o app est? ativo e ao retornar ao primeiro plano. GET /notifications/feed devolve somente eventos do personal autenticado; alunos e outros profissionais n?o acessam seus avisos.

Abrir a janela n?o apaga os avisos. Tocar em um item registra sua leitura e abre o destino; Marcar todas como lidas registra os itens apresentados. POST /notifications/read valida os IDs contra os eventos do pr?prio personal. A leitura persiste por conta no servidor, compartilhada entre aparelhos, com grava??o at?mica e trava. Cadastros pendentes abrem diretamente /alunos/cadastros, com Ver ficha, Aprovar e Recusar, sem exigir rolagem pela p?gina do link. Link de cadastro permanece dispon?vel separadamente.

No primeiro acesso compatível, o aplicativo apresenta “Receber notificações?”, com “Permitir notificações” e “Agora não”. O pedido do sistema acontece ao tocar em Permitir. A escolha é lembrada neste aparelho; PWA instalado e APK têm convites próprios. O sino mantém as opções de ativar/desativar. No iPhone/iPad, Web Push exige iOS/iPadOS 16.4 ou superior e abertura pelo ícone da tela inicial. O APK Android 1.1.0 usa Firebase Cloud Messaging e canal nativo, com vínculo por conta e abertura do destino autenticado ao tocar. A versão 1.0.0 requer atualização; a implementação Expo executada fora desse contêiner continua sem provedor push. Consulte o [guia Android](../06-operations/android-apk.md).

O PWA usa Push API, VAPID ES256 e worker dedicado sem cache offline. A notifica??o do sistema diz Novidade no T? Pago, com texto gen?rico, sem nomes ou informa??es de sa?de; tocar abre /notificacao e o setor do aviso ap?s autentica??o. Sair remove a inscri??o deste aparelho. Chaves e inscri??es cifradas permanecem no armazenamento privado existente; leituras ficam no subdiret?rio read. Preservar ambos nos deploys e backups.

Cadastro, conclus?o e feedback disparam somente ap?s a confirma??o da transa??o. Duplicatas preservam o ID e n?o geram novo evento. O despachante mant?m IDs enviados por aparelho, repete falhas com espera progressiva e descarta inscri??es 404/410. Eventos anteriores ? ativa??o ou com mais de 24 horas n?o geram push. V?rios eventos podem ser agrupados em um aviso gen?rico. A entrega depende de permiss?o, conex?o e configura??es do aparelho. Somente endpoints HTTPS de Google, Apple, Mozilla e Windows explicitamente permitidos s?o aceitos; redirecionamentos s?o rejeitados.

Valida??o local: 17 testes de API Node e tr?s cen?rios de navegador passaram, verificando isolamento entre profissionais, leitura persistente, convite inicial, ponto vermelho, abertura direta da an?lise e apresenta??o gen?rica pelo worker. A su?te PHP passou 138 verifica??es HTTP e os ensaios de migra??o. Aparelhos f?sicos n?o foram testados nesta altera??o. Refer?ncias: [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API), [Web Push no WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [VAPID RFC 8292](https://www.rfc-editor.org/rfc/rfc8292).

## Confirmação do cadastro por link

Após o envio bem-sucedido do formulário público, a confirmação informa: “Seu perfil foi criado com sucesso! Agora, aguarde a análise e aprovação do seu personal.” A mensagem substitui o aviso anterior sobre criação de conta. O fluxo permanece pendente de aprovação pelo profissional; a mudança é somente de texto e não altera criação de contas, vínculo ou liberação de acesso.

## Persistência e operação

SQLite local em data/tapago.db, ignorado pelo Git, separado do banco RAG. O arquivo não possui criptografia de conteúdo: acesso ao sistema operacional e backups precisam ser controlados. Não enviar prontuários, exportações nem credenciais ao catálogo de conhecimento.

Use personal:setup para migrações e seed idempotente, personal:build e personal:start para servir em localhost:3003. Leia [ambiente local](../04-development/local-setup.md) para importar o banco anterior sem alterar a origem. O login anterior é mantido após a importação; sessões exigem novo login.

## Configuração

PERSONAL_DATABASE_URL define SQLite; PERSONAL_API_PORT e PERSONAL_API_HOST definem escuta. PERSONAL_APP_ORIGINS lista origens web permitidas, separadas por vírgula. EXPO_PUBLIC_PERSONAL_API_URL define endereço público da API para dispositivo; jamais coloque segredo em variável EXPO_PUBLIC. COOKIE_SECURE=true é necessário ao operar com HTTPS. Produção exige configuração própria de HTTPS, backup, operação e validação em dispositivos. Não há deploy público nesta entrega.

## Disponibilidade e acesso ap?s aprova??o

A ficha p?blica solicita Disponibilidade em dias por semana com teclado num?rico e valor de 1 a 7. O campo Dias de atividade por semana continua descrevendo a pr?tica atual. Para preservar fichas anteriores, a disponibilidade continua armazenada como texto; o novo formul?rio envia N dias por semana. Na aprova??o, esse valor determina weeklyFrequency quando estiver nesse formato; fichas legadas conservam a regra anterior.

Ao aprovar, a interface reserva uma janela durante o toque e abre a conversa do WhatsApp do aluno com mensagem pronta. O professor confirma o envio no pr?prio WhatsApp; n?o h? integra??o de envio autom?tico. A mensagem cont?m e-mail e link de ativa??o, sem senha. O bot?o Enviar acesso pelo WhatsApp permite repetir; cada novo link invalida o anterior. Aprova??o ? mantida se a prepara??o ou abertura da mensagem falhar, com erro expl?cito.

POST /enrollment/requests/:id/access exige personal propriet?rio, ficha aprovada e v?nculo n?o encerrado. Para aluno sem conta vinculada, gera Invitation de uso ?nico, com token aleat?rio de 32 bytes, somente hash persistido e validade de 48 horas. O link abre /ativar?convite=TOKEN. GET /public/student-access/:code apresenta nome, e-mail e indica??o de conta existente somente com convite v?lido. POST cria exclusivamente conta de aluno e v?nculo, consome o convite e guarda hash da senha, com transa??o e limita??o de tentativas. N?o aceita e-mail nem papel fornecidos pelo cliente e nunca redefine conta existente.

Se j? existe conta com esse e-mail, a tela exige a senha atual e usa o fluxo autenticado de aceite. Se o aluno j? est? vinculado, a mensagem aponta para /entrar e n?o gera convite. Nenhuma mensagem real de aluno foi enviada durante a valida??o. Testes Node verificam escopo, aprova??o, senha m?nima, papel fixo, expira??o, consumo e preserva??o da senha existente; o navegador percorre ficha, disponibilidade num?rica, mensagem interceptada e ativa??o at? os treinos.

## Senhas de acesso

Cadastro público, ativação por convite e login aceitam qualquer senha com pelo menos seis caracteres, sem exigir combinação de tipos e sem limite específico de 128 caracteres. Espaços são preservados. A interface e o servidor Express contam pontos de código Unicode por `Array.from`; PHP usa `mb_strlen`, evitando aceitar três emojis como seis caracteres. A confirmação na ativação deve coincidir com a senha. Os limites gerais de tamanho da requisição continuam independentes da regra da senha. Senhas existentes e seus hashes não são alterados.

`shared/password.ts` concentra o mínimo e a mensagem usados pelo cliente e Express. PHP aplica a mesma regra em `Auth.php`. Testes cobrem seis letras, números, símbolos, emojis, espaços e senha de 129 caracteres, rejeição abaixo de seis, ativação com convite e login após ativação. O navegador percorre aprovação, mensagem pronta no WhatsApp e ativação com seis caracteres. A checagem em produção usou somente login de endereço sintético inexistente, sem criar ou modificar contas.

## Diagnóstico de alertas no aparelho

Notifica??es ativadas confirma a inscri??o e a permiss?o informada pelo navegador; n?o comprova exibi??o pelo Android. A interface revalida o estado ao retornar ao primeiro plano e ao abrir as op??es. Testar alerta no celular solicita uma notifica??o local ao worker, sem criar cadastro nem enviar dados a outro aparelho. Testar alerta com app fechado agenda um aviso somente para a inscri??o atual: POST /notifications/test exige propriet?rio, inscri??o v?lida e intervalo m?nimo de 90 segundos entre testes.

O teste fica persistido na inscri??o privada com vencimento em 15 segundos. O cron existente envia na pr?xima execu??o, normalmente em at? 90 segundos; repeti??o ap?s aceite do provedor n?o envia outro teste. Falhas seguem o retry existente. O agendamento n?o cria evento na central nem altera cadastro. A inscri??o de outro personal n?o pode ser usada. Testes usam apenas endpoints sint?ticos e transporte simulado. Aceite do provedor n?o equivale a alerta exibido, e a entrega no celular do respons?vel permanece dependente de teste f?sico.

## Destino ao tocar na notifica??o do celular

O worker solicita imediatamente a apresenta??o do alerta, sem consultar a rede antes. O aviso continua gen?rico e o push do provedor continua sem payload. O destino ? resolvido ao tocar, pelo feed autenticado de /notificacao. N?o adiciona cache offline nem intercepta??o de requisi??es.

Ao tocar, abre URL absoluta na mesma origem por clients.openWindow, que pode retomar o PWA instalado no Android, e tenta focar a janela retornada. Se a abertura falhar, tenta focar e navegar uma janela existente; erros de uma janela n?o interrompem a tentativa nas demais. Destinos externos ou fora de /notificacao s?o ignorados.

A tela p?blica /notificacao mant?m o ID durante a autentica??o e consulta novamente o feed do personal autenticado antes de navegar. Um cadastro pendente abre /alunos/cadastros?cadastro=ID, filtrando a ficha correspondente com Aprovar, Recusar e Ver ficha. Ver todos os cadastros recebidos remove o filtro. Treino conclu?do ou feedback abre os treinos do aluno; cadastro j? aprovado segue o destino atual do feed. A leitura do evento ? registrada ao abrir. N?o permite que par?metros de URL escolham destinos externos ou acessem avisos de outro profissional. Sem evento dispon?vel, abre a central de novidades. Conta de aluno segue para a pr?pria p?gina inicial.

Valida??o: tr?s testes do worker cobrem abertura com app fechado, retorno a janela existente, consulta indispon?vel e bloqueio de URL externa. Cen?rios de navegador verificam entrada pelo aviso, tela espec?fica do cadastro, destino de treino e retomada ap?s login. O toque real no alerta do Android ainda precisa ser conferido ap?s a atualiza??o do worker no aparelho.

## Confirma??o de recebimento no aparelho

Ap?s solicitar showNotification, o worker tenta POST /notifications/receipt na mesma origem, com sess?o, inscri??o atual e booleano de sucesso da apresenta??o. A chamada tem timeout de tr?s segundos e falhas n?o impedem a notifica??o. O endpoint exige personal propriet?rio da inscri??o e grava lastReceivedAt e lastDisplaySucceeded no arquivo privado existente, sob a mesma trava. O despachante grava lastAcceptedAt ao obter aceite do provedor. Sem sess?o v?lida, a confirma??o pode faltar mesmo quando o aviso foi apresentado. Sucesso da API de apresenta??o n?o comprova que o usu?rio viu popup, ouviu som ou leu o aviso; as configura??es do Android continuam determinantes. Nenhum nome ou dado de sa?de ? inclu?do na confirma??o.
