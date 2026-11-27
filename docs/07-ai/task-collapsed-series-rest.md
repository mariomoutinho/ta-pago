---
{
  "id": "ta-pago.docs.07-ai.task-collapsed-series-rest",
  "title": "Séries e descanso nos exercícios recolhidos",
  "status": "current",
  "owner": "mariomoutinho",
  "updated_at": "2026-11-27",
  "language": "pt-BR",
  "tags": [
    "07-ai"
  ],
  "indexable": false,
  "sources": [
    "src/components/workouts/professional-exercise-summary.tsx",
    "src/components/workouts/workout-window.tsx",
    "src/components/workouts/workout-exercise-list.tsx",
    "src/components/workouts/rest-timer.tsx",
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

# Séries e descanso nos exercícios recolhidos

A tela enviada mostra a visão profissional, que antes exibia somente o nome e os comandos de edição no cartão recolhido. O resumo profissional agora mostra o total real de séries prescritas e permite iniciar cada duração de descanso prescrita. O contador regressivo e a barra ficam fora da expansão, identificados por exercício em combinados.

Reutiliza prescribedSets, initialSeries, formatRest e useRestTimer. O prazo profissional usa chave separada por conta, treino, exercício e prescrição, sem escrever progresso, conclusões ou feedbacks do aluno. Pode ser cancelado; ausência de intervalo positivo aparece como Sem intervalo prescrito. As limitações existentes de som em segundo plano permanecem. Sem mudança de backend, banco ou dependências.

Typecheck e build web passaram. Dois cenários Playwright passaram: regressão completa de execução Focus do aluno e resumo profissional recolhido com séries, contagem, expansão/recolhimento, recarga, cancelamento, término e ausência de progresso/conclusão gravados pelo professor. Captura mobile escura em data/professional-collapsed-rest.png inspecionada.

Validação documental e manifestos determinísticos executados. docs:test mantém duas falhas de links simbólicos por EPERM; code:test mantém as falhas de links simbólicos e proveniência Git já registradas neste Windows. Extratores preservados.

Prévia local atualizada; sem deploy ou teste em aparelho físico. Gradle e arquivos pessoais preexistentes preservados.
