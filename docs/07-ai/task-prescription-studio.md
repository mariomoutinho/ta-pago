---
{
  "id": "ta-pago.docs.07-ai.task-prescription-studio",
  "title": "Formulário de prescrição no visual Studio",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-27",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/components/workouts/prescription-action.tsx",
    "src/components/workouts/prescription-form.tsx",
    "src/components/workouts/series-editor.tsx",
    "src/components/workouts/workout-screen.tsx",
    "src/components/workouts/workout-editor.tsx",
    "src/components/workouts/workout-window.tsx",
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
    "ta-pago.docs.03-features.workouts"
  ],
  "framework_version": "Expo 57; React Native 0.86.2; TypeScript 6",
  "domain": "ai"
}
---

# Formulário de prescrição no visual Studio

Implementa a segunda imagem fornecida como referência para prescrever/editar exercícios: cabeçalho com haltere, descrição, retorno com seta, cartão com nome e categoria/grupo muscular reais, campos maiores, ações auxiliares com ícones, divisória antes da confirmação e rodapé com opções/cancelar. Telas estreitas reorganizam os campos e botões sem rolagem horizontal.

Reutiliza StudioAction, useTheme, tokens de cores, fontes e Lucide. A apresentação prescription é opcional no SeriesEditor e WorkoutScreen; demais usos mantêm a apresentação anterior. Mantém Tipo acessível, limite de 50 linhas, validações, presets, observações e persistência. Excluir linha aparece somente com mais de uma linha. Sem nova dependência, backend ou migração.

Validação: typecheck e build web passaram. Três cenários de navegador aprovados (prescrição de aluno, modelo preparado, séries por tipo/alongamento/corrida), incluindo 390/1280 px, temas claro/escuro e observação adicional gravada. Capturas em data/prescription-redesign-*.png inspecionadas. Dois seletores antigos foram ajustados para buscar o exercício sintético na biblioteca, que agora contém o catálogo automático.

Validação documental e manifestos determinísticos executados. docs:test mantém 31 sucessos e duas falhas de links simbólicos por EPERM; code:test mantém 17 sucessos e três falhas preexistentes (links simbólicos e proveniência Git). Extratores preservados.

Prévia local atualizada em localhost:3003. Sem deploy, teste em aparelho físico ou afirmação de CI remota. Gradle e arquivos pessoais preexistentes preservados.
