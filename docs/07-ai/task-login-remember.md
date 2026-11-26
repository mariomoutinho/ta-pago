---
{
  "id": "ta-pago.docs.07-ai.task-login-remember",
  "title": "Login com acessos lembrados e visibilidade de senha",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/app/entrar.tsx",
    "src/app/ativar.tsx",
    "src/components/personal/password-field.tsx",
    "src/components/personal/ui.tsx",
    "src/components/personal/login-form.tsx",
    "src/components/personal/login-form.web.tsx",
    "src/features/personal/auth.tsx",
    "src/features/personal/remembered-login.ts",
    "src/features/personal/remembered-login.native.ts",
    "tests/personal/remembered-login.test.ts",
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

# Login com acessos lembrados e visibilidade de senha

## Escopo e implementação

Pedido: lembrar e-mails e senhas que acessaram o aplicativo e incluir o botão de olho dentro do campo, à direita, seguindo o estilo do projeto. Estado inicial: branch feat/professional-studio-layout, commit ea55fc7, com alterações de Gradle e arquivos pessoais preexistentes preservados.

A opção Lembrar e-mail e senha começa desmarcada e só salva após a API autenticar. A lista admite cinco e-mails distintos, em ordem recente, com seleção e ação Esquecer e-mail. Nenhuma conta recebe perfil ou permissão por essa lista; o login continua passando pela API.

Na web, somente os e-mails são armazenados pelo app em localStorage. PasswordCredential e navigator.credentials.store/get integram o gerenciador do navegador, quando disponível. A confirmação e disponibilidade do salvamento pertencem ao navegador; os campos de autocomplete e o formulário semântico continuam disponíveis como fallback. Esquecer o e-mail da lista não remove senhas do gerenciador do navegador. Não foi implementada extração retroativa de históricos de login do navegador.

No nativo, expo-secure-store guarda lista e senhas, com chave por conta e proteção WHEN_UNLOCKED_THIS_DEVICE_ONLY para credenciais. Remoção e limite de cinco contas eliminam as credenciais nativas correspondentes. O SessionProvider aceita callback opcional depois da autenticação e antes de atualizar a tela; falhas de preferências de preenchimento não impedem o acesso validado. A política de sessão, cookies, autorização e backend não foi alterada.

PasswordField reutiliza Field com espaço reservado para a ação à direita. Eye/EyeOff usa Lucide, traço 1,75 e cores do tema, com área de toque de 44 px e rótulos acessíveis. A senha começa oculta e a alternância preserva o conteúdo. O componente atende login/cadastro e os campos de criação/confirmação da ativação de aluno. O formulário web usa POST com preventDefault e a submissão tem trava contra duplicação.

## Evidências e limites

Quatro testes unitários passaram, cobrindo limite e ordem de contas, senha fora do localStorage, gerenciador indisponível, credencial de outra conta, armazenamento bloqueado e remoção/evicção com SecureStore simulado. Os cenários de navegador cobrem olho, autocomplete, lembrar após sucesso, não salvar senha incorreta, selecionar conta, esquecer, recarregar, ausência da API de credenciais, opção desmarcada e cadastro público de aluno. O cenário de fallback também verifica envio por Enter.

O teste do gerenciador usa uma simulação da API no navegador; ele confirma a integração e o limite de armazenamento do app, sem afirmar que um gerenciador real salvou a senha ou mostrou seu diálogo. A captura de 390 px foi inspecionada e mostrou o olho dentro do campo, à direita, sem exibir o conteúdo da senha. Não houve teste físico em Android/iOS nem publicação no site.

No primeiro ensaio, o teste esperava atributo HTML type=text explícito quando a senha era exibida; React Native Web omite esse atributo, e a propriedade DOM é text por padrão. A verificação passou a conferir a propriedade real do campo, preservando a exigência de conteúdo e estado visível.

A entrega permanece local e no Git. A prévia usa o banco de demonstração já existente e não copia dados ou senhas de produção. A publicação do conjunto de ajustes posteriores ao Studio continua pendente de autorização explícita.

Resultados finais: quatro testes unitários, três cenários Playwright e sete testes de pacote aprovados. `typecheck`, build web, build PHP/Web, validação documental, inventário e checks dos manifestos passaram. `docs:test` e `code:test` mantiveram respectivamente duas e três falhas de infraestrutura já observadas (links simbólicos e proveniência Git neste Windows). Os extratores excluíram conservadoramente os módulos remembered-login pelos identificadores credential/credentialKey; essa exclusão foi revisada, sem flexibilizar o detector ou indexar dados de acesso. Não foi executado novo teste de backend, pois não houve mudança no servidor.

Referências consultadas: [SecureStore no Expo 57](https://docs.expo.dev/versions/v57.0.0/sdk/securestore.md) e [salvamento de credenciais em formulários](https://web.dev/articles/security-credential-management-save-forms).
