---
{
  "id": "ta-pago.docs.07-ai.task-admin-profiles",
  "title": "Consulta administrativa de alunos e professores",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": ["07-ai"],
  "indexable": false,
  "sources": ["server/admin.ts", "server/app.ts", "backend-php/src/Admin.php", "backend-php/src/Auth.php", "backend-php/config.example.php", "src/app/administracao.tsx", "src/app/_layout.tsx", "src/components/studio/professional-layout.tsx", "tests/personal/admin.test.ts", "tests/personal/browser/app.spec.ts"],
  "repository": "mariomoutinho/ta-pago",
  "branch": "main",
  "commit_sha": "aaa87fefa966c6c358fc82d3fe3deb418203baeb",
  "version": "1.1.0",
  "authority": "code",
  "audience": ["developer", "ai_agent", "reviewer"],
  "sensitivity": "internal",
  "supersedes": [],
  "related_documents": ["ta-pago.docs.03-features.personal-integration"],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Consulta administrativa de alunos e professores

## Escopo e estado inicial

Pedido: permitir ao responsável consultar todos os perfis de alunos e professores, preservando sua conta profissional. Estado inicial: branch feat/professional-studio-layout, commit e03fc32. A alteração de Gradle e os arquivos pessoais preexistentes foram preservados. Identificadores reais e a redefinição autorizada de senha permanecem fora das fontes e manifestos.

## Implementação e decisões

Foi adicionada capacidade administrativa por IDs privados, sem retirar os recursos profissionais. A tela /administracao oferece busca, filtro, totais, paginação e professores responsáveis. A API de consulta retorna projeção mínima e integra contas de aluno e fichas sem login. A proteção é aplicada no servidor, na navegação e na rota do app. Express e PHP usam listas privadas equivalentes e começam com administração desabilitada quando a lista é vazia.

A autenticação continua conferindo a autorização profissional existente. Cadastro público não pode atribuir essa capacidade. A consulta não retorna senha, hash ou saúde. Senhas existentes não podem ser recuperadas do hash; redefinir senha exige operação explícita no ambiente real e invalidação das sessões correspondentes.

## Evidências e limites

Quatro testes de API passaram, cobrindo acesso anônimo/professor/aluno, promoção forjada pelo cliente, projeção sem dados privados, fichas sem conta, ausência de duplicidade de aluno vinculado, busca sem acentos, filtro, paginação, filtros inválidos e revogação em sessão existente. Um teste de navegador passou, conferindo a tela, busca de conta e bloqueio de professor comum. Build web, typecheck e sintaxe de 30 arquivos PHP passaram. Os testes usam dados sintéticos; a integração PHP com MySQL real não foi executada.

docs:validate, code:inventory, code:check e knowledge:build passaram. docs:test teve 31 sucessos e duas falhas de criação de links simbólicos por EPERM no Windows. code:test teve 17 sucessos e três falhas: duas de links simbólicos e uma de proveniência Git. São limitações já observadas no ambiente, sem alteração dos extratores nesta tarefa.

A listagem em memória usa somente campos administrativos e páginas de 25 itens. Não há edição ou redefinição pública de senha nessa tela. A consulta inicial a crons foi rejeitada pela revisão automática, e nenhum comando privado existente foi consultado.

## Publicação e operação autorizadas

O responsável autorizou explicitamente publicar o pacote atual e executar uma tarefa temporária restrita à habilitação administrativa e à redefinição de senha de uma conta de aluno. Em 26/11/2026, no horário de Brasília, a revisão 03a21c1 foi publicada em https://tapago.coletivopindorama.com.br. O pacote inclui os ajustes anteriores de catálogo, pastas, presets, exercícios, login e administração.

A rotina exclusiva de CLI confirmou os papéis das duas contas e a autorização profissional existente antes de escrever. Criou backup privado dos arquivos e da configuração, aplicou a migração aditiva de pastas, verificou os 55 arquivos por hash no servidor, manteve os demais valores privados e adicionou o ID administrativo. A redefinição afetou somente a conta de aluno solicitada e removeu uma sessão antiga. Nenhum e-mail real, senha, hash ou token integra este relatório ou os manifestos.

A tarefa temporária concluiu com sucesso e sua exclusão foi aceita pela Hostinger. O arquivo de execução removeu a si mesmo; a listagem posterior da raiz confirmou sua ausência. Não foram consultadas as tarefas anteriores. O cache foi limpo. A conferência HTTP validou 34 arquivos públicos; 22 PNGs transformados pela CDN tiveram dimensões e todos os pixels comparados aos originais, incluindo a logo. Os outros 21 arquivos protegidos tiveram seus hashes conferidos pela rotina no servidor.

O login do aluno com a nova senha passou em produção, assim como a consulta da sessão. A API administrativa retornou 403 para esse aluno. A sessão criada somente para o teste foi encerrada. A saúde da API respondeu 200 e status ok. O acesso administrativo foi habilitado na configuração privada e validado pela rotina; não foi utilizado o segredo de login do professor para testar sua sessão real. A entrega da nova credencial acontece somente ao responsável, fora dos arquivos versionados.
