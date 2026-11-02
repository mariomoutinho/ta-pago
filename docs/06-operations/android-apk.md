---
{
  "id": "ta-pago.docs.06-operations.android-apk",
  "title": "APK Android conectado ao site",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-02",
  "language": "pt-BR",
  "tags": ["06-operations", "android"],
  "indexable": true,
  "sources": [
    "native-android/app/src/main/res/raw/tapago_alert.wav",
    "scripts/android/generate-alert.mjs",
    "native-android/app/build.gradle",
    "native-android/app/src/main/AndroidManifest.xml",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/MainActivity.java",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/NavigationPolicy.java",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/NativePush.java",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/PushService.java",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/PushPolicy.java",
    "native-android/app/src/androidTest/java/br/com/coletivopindorama/tapago/PushDeliveryTest.java",
    "backend-php/src/AndroidPush.php",
    "server/android-push.ts",
    "native-android/app/src/test/java/br/com/coletivopindorama/tapago/NavigationPolicyTest.java",
    "scripts/android/build.mjs",
    "src/features/personal/push-device.web.ts",
    "src/components/personal/enrollment-notifications.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.1.2",
  "authority": "code",
  "audience": ["developer", "operations", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.06-operations.php-hostinger-deployment"],
  "framework_version": "Android API 26–36; Java 17; AGP 8.13; Gradle 8.14.3",
  "domain": "operations"
}
---

# APK Android conectado ao site

## Escopo

O projeto `native-android` é um contêiner Android separado do aplicativo Expo e abre exclusivamente a origem HTTPS do Tá Pago. Preserva `src/app`, `src/components`, `src/constants` e `src/hooks`. O conteúdo continua servido pelo site: mudanças de telas e funcionalidades web aparecem ao carregar o aplicativo, sem gerar outro APK. Mudanças do contêiner, permissões e integração de notificações exigem recompilação e atualização do APK.

O pacote é `br.com.coletivopindorama.tapago`, versão 1.1.2, versionCode 10102, com Android 8 ou superior. Tem ícone da marca, tema sem ActionBar, respeita barras do sistema, recortes da tela e teclado. Não oferece navegação offline nem replica o banco no dispositivo. A sessão usa cookies da WebView, separados da instalação PWA/navegador; o usuário precisa entrar novamente após a primeira instalação. A atualização assinada com a mesma chave preserva os dados do aplicativo.

## Capacidades e fronteiras

Navegação interna aceita somente HTTPS no host exato do aplicativo, sem credenciais na URL nem portas alternativas. HTTP e acesso a arquivos locais são bloqueados; erros de certificado não são ignorados. Links HTTPS externos, WhatsApp, telefone e e-mail são encaminhados aos aplicativos do Android. Links `tapago://app/...` são convertidos para o próprio site, sem aceitar hosts arbitrários. Verificação de propriedade para Android App Links HTTPS ainda não está configurada.

A seleção de arquivos usa o seletor do sistema, sem permissão ampla ao armazenamento. Vídeos podem usar tela cheia. Downloads da origem autenticada e exportações por Blob usam a criação de documento pelo Android, com limite de 8 MiB; o usuário escolhe onde salvar. A ponte de mensagens é permitida somente à origem do Tá Pago e ao documento principal, sem exposição para os iframes dos exercícios. A WebView tem depuração desabilitada na compilação release.

## Compilação e assinatura

Executar `npm run android:apk` na raiz com JDK 17+, Android SDK 36, build tools e acesso aos repositórios oficiais Google/Maven/Gradle. `TAPAGO_JAVA_HOME` pode selecionar o JDK; `ANDROID_HOME` ou `ANDROID_SDK_ROOT` selecionam o SDK. No Windows, o script também reconhece a instalação padrão do Android Studio. `node scripts/android/build.mjs --offline` exige todas as dependências previamente no cache.

O script gera uma assinatura privada local somente na primeira execução e a guarda em `data/android-signing`, ignorada pelo Git. Se existir keystore sem o arquivo de configuração, interrompe para evitar perda da identidade de assinatura. Preservar esse diretório em backup privado: atualizações instaladas sobre o APK anterior exigem a mesma chave e um versionCode maior. Nunca enviar a chave, senhas ou configuração de assinatura à hospedagem pública, ao repositório ou ao catálogo.

A compilação executa os testes unitários de navegação e destino/vínculo das notificações, lint Android e assembleRelease. O resultado e o SHA-256 ficam em `data/android-release`. Publicar somente o APK e seu checksum. Não publicar fontes de configuração privada ou backups. O nome e os metadados do artefato derivam da versão declarada no Gradle.

## Notificações nativas

A versão 1.1.0 integra Firebase Cloud Messaging para Android; a 1.0.0 continua sem esse recurso e precisa ser atualizada. O cliente usa a configuração Android em `data/firebase/google-services.json`, ignorada pelo Git. O Gradle extrai somente os identificadores e a chave pública de cliente necessários ao SDK. A chave de conta de serviço nunca participa do build do APK. `npm run android:apk` interrompe se a configuração Android estiver ausente ou incompatível; `--without-push` permite apenas validar uma compilação explicitamente identificada como sem push.

A ponte Android recebe solicitações somente do documento principal na origem do Tá Pago. Após login do personal, a interface oferece ativação. Android 13 ou superior pede a permissão do sistema; o canal “Novidades do Tá Pago” usa importância alta, som e vibração. O registro autenticado confirma o vínculo somente após o servidor aceitar a inscrição. O dispositivo recebe um vínculo opaco por conta e rejeita mensagens de vínculos anteriores. A saída ou desativação limpa esse vínculo, remove avisos locais, solicita exclusão do token no Firebase e cancela a inscrição do servidor. A reconciliação ocorre ao abrir/retomar; a rotação também tenta atualizar o servidor com a sessão existente e volta a reconciliar se ela expirou.

PHP e Express mantêm até dez instalações Android por personal, com tokens cifrados e arquivos privados separados do Web Push. A credencial PHP fica por padrão em `tapago-private/firebase-service-account.json`; `fcmServiceAccountFile` permite outro caminho privado. Express usa `PERSONAL_FCM_SERVICE_ACCOUNT_FILE`. Usam OAuth RS256 com escopo Firebase Messaging e FCM HTTP v1, sem nomes, dados de saúde ou texto de treino nos avisos externos. A conta de serviço tem o papel de envio FCM no projeto do responsável. Não registrar tokens, chaves, códigos OAuth ou dados reais no catálogo.

Cadastros, conclusões de treino e feedbacks disparam o envio após confirmar a transação; o mesmo cron existente processa tentativas pendentes e testes agendados. O envio tem IDs para evitar repetição, espera progressiva em falhas e remove tokens que o FCM identifica como `UNREGISTERED`. Erros genéricos de projeto ou permissão não removem dispositivos. O teste com app fechado é agendado para após 15 segundos, processado pelo cron em até cerca de 90 segundos.

As mensagens de dados usam prioridade alta e o serviço nativo exibe o aviso imediatamente após validar o vínculo. O toque usa PendingIntent explícito e imutável para a Activity do Tá Pago, com ID validado. O resolver autenticado `/notificacao?aviso=...` consulta o feed da conta: cadastro pendente abre aprovação/recusa do cadastro específico; conclusão ou feedback abre treinos do aluno. Preserva o destino durante login e abre novidades se o ID não existe mais no feed. A mensagem não pode escolher uma URL externa.

Recebimento real exige Google Play Services, internet, permissão do sistema e canal habilitado. O Android controla a apresentação como popup, Não perturbe e restrições de bateria; “Forçar parada” impede recebimento até reabrir o app. A aceitação HTTP do FCM não prova exibição no aparelho. O sino e o fluxo Web Push existente permanecem independentes.

Referências: [WebView Android](https://developer.android.com/develop/ui/views/layout/webapps/webview), [permissão de notificações](https://developer.android.com/develop/ui/compose/notifications/notification-permission), [cliente FCM Android](https://firebase.google.com/docs/cloud-messaging/android/client) e [envio FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

## Validação da primeira versão

Em 01/11/2026, a compilação release assinada concluiu três testes unitários, lint sem erros e assembleRelease. A assinatura v2 foi verificada com apksigner; o pacote declara API mínima 26 e alvo 36. O APK foi instalado no emulador Android, com abertura do site, formulário de entrada, digitação e teclado, retomada por link `tapago://app/notificacao` e ausência de falha do processo do aplicativo nos logs verificados. Não foi efetuado login com conta real nem teste em aparelho físico. O emulador apresentou inicialmente uma falha do System UI durante sua inicialização; após estabilização e reinício do processo do aplicativo, a tela foi conferida sem esse diálogo.

O arquivo de 945.005 bytes foi publicado como APK Android 1.0.0, com MIME de pacote Android e SHA-256 remoto conferido contra o arquivo local. A publicação do bundle preservou a saúde da API. O novo login na Hostinger foi autorizado pelo responsável para renovar a sessão expirada; a chave de assinatura do APK permaneceu somente no diretório privado local.

## Validação e publicação da versão 1.1.0

Em 01/11/2026, o responsável concluiu OAuth do Google e autorizou explicitamente criar o projeto Firebase, registrar o pacote Android e criar a conta de serviço com permissão FCM e chave privada para a Hostinger. Uma primeira tentativa foi bloqueada pela revisão automática por falta dessa autorização específica; a operação foi retomada após a autorização. O projeto e a configuração de envio foram criados na conta conectada. A chave foi transferida por HTTPS diretamente ao armazenamento privado, sem incorporá-la ao código do helper público, ao APK ou ao Git.

O backend PHP e o bundle web foram publicados com conferência de hashes, backup privado e preservação da configuração, banco e inscrições Web Push existentes. A API respondeu saudável após a publicação. Um aviso de teste saiu da Hostinger por OAuth/FCM HTTP v1 e foi aceito com HTTP 200; o teste instrumentado no emulador confirmou a notificação na bandeja com o app em segundo plano e a abertura da Activity pelo PendingIntent. Nenhuma conta real foi usada nesse teste. O helper temporário de implantação foi removido ao final.

O [APK Android 1.1.0](https://tapago.coletivopindorama.com.br/downloads/ta-pago-android-1.1.0.apk) tem 2.922.624 bytes, versionCode 10100, assinatura v2 e SHA-256 `6da07d87ad4a6fdf37bbb4eeb44a19b0f707ed7af9499e5955ea8e09270d99dd`. Download remoto, MIME e checksum foram conferidos; a instalação sobre a versão anterior no emulador foi aceita. O recebimento no celular do responsável depende de instalar a atualização e permitir notificações; não é demonstrado somente pelo resultado do emulador.

Validações: seis testes unitários Java, onze testes focados de push Express e concorrência na ativação, dois fluxos de navegador (ponte nativa e direcionamento com login), 164 verificações HTTP PHP e migrações sintéticas passaram. Typecheck do app e servidor, lint PHP, validações documentais e checagens dos catálogos passaram. Na suíte completa Personal, 120 testes passaram e um teste anterior de importação falhou por tentar executar o shim Unix do Prisma no Windows (`ENOENT`). Permanecem as falhas preexistentes em docs:test (31 passaram, duas restrições de symlink do Windows) e code:test (17 passaram, duas restrições de symlink e uma expectativa de proveniência). Não há comprovação de execução da CI remota nesta etapa.

A revisão final 1.1.1 dá prioridade ao destino do aviso/link sobre o estado da WebView salvo pelo Android. O APK final, também com 2.922.624 bytes, foi publicado em [Baixar Tá Pago 1.1.1](https://tapago.coletivopindorama.com.br/downloads/ta-pago-android-1.1.1.apk), com SHA-256 `cbec95d5bddb570c5ce75d05f835cf79d0c48a6ce99ebcc93f48f8e5be4253bd`, assinatura v2 verificada, seis testes unitários e lint sem erros. A entrega real e o clique foram repetidos com sucesso nessa versão no emulador; o primeiro teste teve origem na Hostinger e a repetição usou a mesma identidade FCM a partir do ambiente local. O APK final preserva o pacote e a chave de assinatura para atualização direta, com versionCode 10101.

## Som das notificações — versão 1.1.2

Em 02/11/2026, o responsável informou recebimento real no celular, popup após cadastro e abertura da tela de aprovação, mas sem som. A versão 1.1.2 inclui um toque original de duas notas, WAV PCM mono de aproximadamente 0,65 segundo, gerado deterministicamente por `scripts/android/generate-alert.mjs`. O canal `tapago_news_sound_v2` configura explicitamente a URI `android.resource` do toque com uso `USAGE_NOTIFICATION` e conteúdo `CONTENT_TYPE_SONIFICATION`, importância alta e vibração. O novo identificador aplica o comportamento sonoro às instalações anteriores, pois o Android não permite reconfigurar o som de um canal já criado. O canal anterior não é apagado; os novos avisos usam o canal com som.

A atualização mantém os mesmos vínculos de conta, permissão global e destino dos alertas. Não solicita acesso para contornar Não perturbe nem altera o volume do aparelho. Modo silencioso/vibração, Não perturbe, volume zero ou escolhas posteriores do usuário no canal podem silenciar os avisos. Referência: [canais de notificação do Android](https://developer.android.com/develop/ui/compose/notifications/channels).

No emulador, o teste instrumentado confirmou URI e atributos do canal, importância alta, decodificação do WAV pelo MediaPlayer e duração esperada. Uma mensagem real FCM foi recebida no novo canal e seu toque abriu a Activity. O emulador foi executado sem saída de áudio; esses testes não comprovam som audível no celular. A assinatura v2 e a instalação sobre a versão anterior foram verificadas. O [APK 1.1.2](https://tapago.coletivopindorama.com.br/downloads/ta-pago-android-1.1.2.apk) tem 2.951.492 bytes e SHA-256 `d0d13e2faba2dca31ff850c3c9cab6e8290d69806daa3d9af61de37d20db4328`; download e checksum remoto foram conferidos.

Nesta revisão, nove testes Express de senha/convite/autorização, duas jornadas de navegador (incluindo ativação com seis caracteres e destino do aviso), 164 verificações HTTP PHP, a matriz de senhas do teste unitário PHP e migrações sintéticas passaram. Typecheck do app e servidor, lint PHP, validação documental e checagens dos catálogos também passaram. Permanecem as mesmas falhas anteriores de infraestrutura nas suítes docs:test (31/33 passaram, symlinks no Windows) e code:test (17/20 passaram, symlinks e expectativa de proveniência). A regra de seis caracteres foi publicada na API PHP e no bundle web; a verificação remota confirmou validação aceita para seis caracteres e 129 caracteres, sem criar ou alterar contas reais.
