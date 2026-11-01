---
{
  "id": "ta-pago.docs.06-operations.android-apk",
  "title": "APK Android conectado ao site",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-01",
  "language": "pt-BR",
  "tags": ["06-operations", "android"],
  "indexable": true,
  "sources": [
    "native-android/app/build.gradle",
    "native-android/app/src/main/AndroidManifest.xml",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/MainActivity.java",
    "native-android/app/src/main/java/br/com/coletivopindorama/tapago/NavigationPolicy.java",
    "native-android/app/src/test/java/br/com/coletivopindorama/tapago/NavigationPolicyTest.java",
    "scripts/android/build.mjs",
    "src/features/personal/push-device.web.ts",
    "src/components/personal/enrollment-notifications.tsx"
  ],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.0.0",
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

O pacote é `br.com.coletivopindorama.tapago`, versão inicial 1.0.0, versionCode 10000, com Android 8 ou superior. Tem ícone da marca, tema sem ActionBar, respeita barras do sistema, recortes da tela e teclado. Não oferece navegação offline nem replica o banco no dispositivo. A sessão usa cookies da WebView, separados da instalação PWA/navegador; o usuário precisa entrar novamente após instalar.

## Capacidades e fronteiras

Navegação interna aceita somente HTTPS no host exato do aplicativo, sem credenciais na URL nem portas alternativas. HTTP e acesso a arquivos locais são bloqueados; erros de certificado não são ignorados. Links HTTPS externos, WhatsApp, telefone e e-mail são encaminhados aos aplicativos do Android. Links `tapago://app/...` são convertidos para o próprio site, sem aceitar hosts arbitrários. Verificação de propriedade para Android App Links HTTPS ainda não está configurada.

A seleção de arquivos usa o seletor do sistema, sem permissão ampla ao armazenamento. Vídeos podem usar tela cheia. Downloads da origem autenticada e exportações por Blob usam a criação de documento pelo Android, com limite de 8 MiB; o usuário escolhe onde salvar. A ponte de mensagens é permitida somente à origem do Tá Pago e ao documento principal, sem exposição para os iframes dos exercícios. A WebView tem depuração desabilitada na compilação release.

## Compilação e assinatura

Executar `npm run android:apk` na raiz com JDK 17+, Android SDK 36, build tools e acesso aos repositórios oficiais Google/Maven/Gradle. `TAPAGO_JAVA_HOME` pode selecionar o JDK; `ANDROID_HOME` ou `ANDROID_SDK_ROOT` selecionam o SDK. No Windows, o script também reconhece a instalação padrão do Android Studio. `node scripts/android/build.mjs --offline` exige todas as dependências previamente no cache.

O script gera uma assinatura privada local somente na primeira execução e a guarda em `data/android-signing`, ignorada pelo Git. Se existir keystore sem o arquivo de configuração, interrompe para evitar perda da identidade de assinatura. Preservar esse diretório em backup privado: atualizações instaladas sobre o APK anterior exigem a mesma chave e um versionCode maior. Nunca enviar a chave, senhas ou configuração de assinatura à hospedagem pública, ao repositório ou ao catálogo.

A compilação executa os testes unitários de política de navegação, lint Android e assembleRelease. O resultado e o SHA-256 ficam em `data/android-release`. Publicar somente o APK e seu checksum. Não publicar fontes de configuração privada ou backups. Versão e nome de arquivo devem ser atualizados de forma consistente no Gradle e no script ao preparar novas versões.

## Notificações nativas: pendentes

Este APK não configura Firebase Cloud Messaging e não recebe notificações push nativas. A interface identifica o contêiner Android e informa essa limitação nas opções de notificações; as novidades do sino continuam funcionando enquanto o aplicativo está em uso. Instalar um APK não transfere a inscrição Web Push do navegador. Não solicitar permissão de notificações enquanto não houver canal nativo configurado.

O responsável informou ainda não possuir projeto Firebase. Para a etapa de notificações, criar um projeto na conta Google do responsável, registrar o pacote Android exato, obter `google-services.json`, configurar o cliente FCM e o envio HTTP v1 no servidor privado. A chave de serviço fica somente no servidor; não deve entrar no APK. Implementar registro/rotação/revogação de tokens por conta, solicitação da permissão Android, canal de notificações e abertura do destino ao tocar. Essa etapa exige nova compilação e teste em aparelho físico; não está concluída por este instalador.

Referências: [WebView Android](https://developer.android.com/develop/ui/views/layout/webapps/webview), [permissão de notificações](https://developer.android.com/develop/ui/compose/notifications/notification-permission), [cliente FCM Android](https://firebase.google.com/docs/cloud-messaging/android/client) e [envio FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

## Valida??o da primeira vers?o

Em 01/11/2026, a compila??o release assinada concluiu tr?s testes unit?rios, lint sem erros e assembleRelease. A assinatura v2 foi verificada com apksigner; o pacote declara API m?nima 26 e alvo 36. O APK foi instalado no emulador Android, com abertura do site, formul?rio de entrada, digita??o e teclado, retomada por link tapago://app/notificacao e aus?ncia de falha do processo do aplicativo nos logs verificados. N?o foi efetuado login com conta real nem teste em aparelho f?sico. O emulador apresentou inicialmente uma falha do System UI durante sua inicializa??o; ap?s estabiliza??o e rein?cio do processo do aplicativo, a tela foi conferida sem esse di?logo.

O arquivo de 945.005 bytes foi publicado em [Baixar APK Android 1.0.0](https://tapago.coletivopindorama.com.br/downloads/ta-pago-android-1.0.0.apk), com MIME de pacote Android e SHA-256 remoto conferido contra o arquivo local. A publica??o do bundle preservou a sa?de da API. O novo login na Hostinger foi autorizado pelo respons?vel para renovar a sess?o expirada; a chave de assinatura do APK permaneceu somente no diret?rio privado local.
