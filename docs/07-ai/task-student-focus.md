---
{
  "id": "ta-pago.docs.07-ai.task-student-focus",
  "title": "Início do aluno no layout Focus",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-26",
  "language": "pt-BR",
  "tags": ["07-ai"],
  "indexable": false,
  "sources": ["src/app/index.tsx", "src/app/perfil.tsx", "src/components/student/home.tsx", "src/components/student/layout.tsx", "src/components/student/profile.tsx", "src/constants/focus.ts", "shared/student-calendar.ts", "server/workouts.ts", "backend-php/src/Workouts.php", "tests/personal/student-calendar.test.ts", "tests/personal/workouts.test.ts", "tests/personal/browser/app.spec.ts"],
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

# Início do aluno no layout Focus

## Escopo e referência

Pedido: adaptar a tela inicial do aluno à proposta Focus apresentada pelo responsável. Estado inicial: branch feat/professional-studio-layout, revisão 852b774. Alterações de Gradle e arquivos pessoais preexistentes foram preservados. A documentação exata do Expo 57 foi consultada antes da edição.

A skill figma-design-to-code foi lida e uma sessão do arquivo foi criada. A consulta inicial da página solicitou screenshot, mas a ferramenta pediu uma camada selecionada; os metadados retornaram a estrutura da página, e o limite do plano Starter bloqueou novas consultas antes do contexto detalhado da tela Focus. O responsável autorizou explicitamente implementar a partir da imagem anexada como referência principal. A captura não foi usada como asset da interface.

## Implementação

StudentLayout mantém a logo local do projeto, identifica a área como ALUNO, oferece controle de tema e publicações do professor e fixa a navegação Início, Treinos e Perfil. A composição segue a referência de 390 × 896 e limita a largura do conteúdo em desktop. Os temas reaproveitam os tokens Studio e os controles existentes; ícones Lucide são importados individualmente.

O início oferece a ação Meus treinos, o calendário mensal com domingo na primeira coluna, marcação do dia atual em Brasília, distinção de dias futuros, legenda e total de treinos concluídos no mês exibido. A consulta é refeita ao recuperar foco; respostas antigas são descartadas e a ação de tentar novamente executa nova consulta. O estado indisponível não é apresentado como zero. O calendário não grava ou simula conclusões.

O novo GET /api/me/workout-calendar?month=AAAA-MM exige conta de aluno e agrega somente as conclusões ligadas ao próprio accountId, com intervalo mensal completo e sem o limite de 30 conclusões por rotina usado na leitura de planos. Duas rotinas concluídas no mesmo dia contam como dois treinos e uma célula treinada. O histórico não desaparece ao arquivar o plano ou remover logicamente uma rotina. Não há migração de banco nem mudança nas permissões profissionais.

A tela /perfil preserva os convites, vínculo com professor, acompanhamento e grupos anteriormente presentes no início. Também reúne os dados da conta e a saída. A rota é exclusiva de alunos. O sino abre as publicações reais de planos do professor, sem inventar notificações não lidas ou novos envios push.

## Validação e limites

Dezoito testes de calendário e treinos passaram, incluindo alinhamento semanal, ano bissexto, mudança de ano, meses inválidos, mês com 31 conclusões de uma rotina, dois treinos no mesmo dia, isolamento entre contas e bloqueio de professor e visitante. A checagem de tipos do app e a sintaxe de 30 arquivos PHP passaram. Dois cenários de navegador passaram: composição Focus, navegação de meses e abas, estados de calendário, mudança de tema, publicações, erro e nova tentativa; e o fluxo existente de aceitar convite, consultar treino publicado e abrir acompanhamento, agora pela aba Perfil. As capturas de 390 px em ambos os temas foram inspecionadas, e a geometria do tema escuro foi comparada à referência. Não houve teste físico em Android/iOS nem integração desta nova consulta PHP com MySQL real.

O primeiro teste de API adicionava seu plano sintético à conta usada pelos cenários seguintes e alterava as premissas de lista vazia. A limpeza dos registros próprios foi incluída ao final do caso e o conjunto passou. O teste da interface também encontrou a ausência de aria-selected na aba e uma tentativa de recarga que não renovava a consulta no retorno à tela. A aba passou a declarar o estado explicitamente, e a recarga passou a executar a requisição diretamente, com contador para descartar respostas obsoletas. A nova tentativa e o retorno entre abas passaram no cenário final.

personal:typecheck encontrou erros preexistentes de tipos DOM em remembered-login.ts (Credential, CredentialRequestOptions e Navigator.credentials), importado pelo conjunto servidor. Esse arquivo não foi alterado nesta tarefa; typecheck do app passou. Não houve alteração dos extratores.

docs:validate aprovou 57 documentos; code:inventory, code:check, knowledge:build e knowledge:check passaram. docs:test manteve 31 sucessos e duas falhas de links simbólicos com EPERM no Windows. code:test manteve 17 sucessos e três falhas já observadas: duas de links simbólicos e uma de proveniência Git. O build web e o pacote PHP foram gerados; os sete testes de integridade e exclusão de segredos do pacote passaram.

As imagens de inspeção usam uma conta sintética e respostas de calendário com os mesmos dias da referência; o aplicativo usa a API real. A lista de publicações usa os planos já disponíveis, sem implementar uma central de notificações de aluno. Nenhuma conta real, senha ou banco de produção foi copiado para a prévia.

A prévia local na porta 3003 foi reiniciada e uma conta sintética de aluno foi vinculada ao professor de demonstração. O login e a consulta real do banco de prévia responderam 200, com 11 conclusões sintéticas no mês de referência; a sessão de verificação foi encerrada.

## Publicação autorizada

O responsável autorizou expressamente publicar esta tela e a consulta mensal. A revisão 5fcd616 foi enviada ao GitHub e publicada em https://tapago.coletivopindorama.com.br em 26/11/2026, no horário de Brasília. A rotina CLI temporária substituiu somente App.php, Workouts.php, o bundle web e index.html, com backup privado e verificação dos quatro hashes. O HTML foi trocado somente depois da verificação do novo backend. A configuração privada teve seu hash preservado; não houve migração nem alteração de perfis, treinos ou senhas.

A rotina verificou a consulta mensal no MySQL real com um identificador sintético sem conta e confirmou a resposta vazia, além do bloqueio 403 para o papel de professor. A tarefa temporária concluiu com sucesso e sua exclusão foi aceita pela Hostinger. O executor removeu a si mesmo; a listagem posterior da raiz confirmou sua ausência. O cache da hospedagem/CDN foi limpo.

A verificação HTTP confirmou os hashes do HTML e bundle, login autenticado de aluno e resposta mensal com contrato e agregação válidos. Mês inválido foi rejeitado com 400, acesso anônimo com 401 e a sessão usada para verificar o aluno foi encerrada. A saúde respondeu 200 e status ok. Os identificadores, dados pessoais e credenciais dessa verificação não foram incluídos nas fontes, no relatório ou nos manifestos. A interface publicada corresponde ao mesmo bundle inspecionado e testado localmente; não houve automação de navegador na conta real.
