// Transcrição do conteúdo fornecido pelo usuário. Apenas espaços de formatação normalizados.
const rows: [string, string, string][] = [
  [
    "Adaptação neuromuscular",
    "Como você avalia sua adaptação aos treinos neste primeiro mês?",
    "Muito difícil|Difícil|Razoável|Boa|Muito boa",
  ],
  [
    "Adaptação neuromuscular",
    "Você percebe que os exercícios estão mais fáceis de executar?",
    "Não percebo diferença|Um pouco|Moderadamente|Bastante|Muito",
  ],
  [
    "Adaptação neuromuscular",
    "Como você avalia sua confiança para executar os movimentos?",
    "Muito baixa|Baixa|Moderada|Alta|Muito alta",
  ],
  [
    "Adaptação neuromuscular",
    "Você percebe alguma melhora na força muscular?",
    "Nenhuma|Pequena|Moderada|Grande|Muito grande",
  ],
  [
    "Recuperação e disposição",
    "Como costuma ser sua recuperação após os treinos?",
    "Muito difícil|Difícil|Razoável|Boa|Muito boa",
  ],
  [
    "Recuperação e disposição",
    "Quanto tempo a dor muscular habitual costuma durar?",
    "Não sinto|Menos de 24 horas|24 a 48 horas|48 a 72 horas|Mais de 72 horas",
  ],
  [
    "Recuperação e disposição",
    "Como está sua disposição para as atividades diárias?",
    "Muito pior|Pior|Sem mudanças|Melhor|Muito melhor",
  ],
  [
    "Recuperação e disposição",
    "Como você avalia a qualidade do seu sono?",
    "Muito ruim|Ruim|Regular|Boa|Muito boa",
  ],
  [
    "Treinamento de força",
    "Como você avalia a dificuldade do treino com ênfase anterior?",
    "Muito fácil|Fácil|Adequado|Difícil|Muito difícil",
  ],
  [
    "Treinamento de força",
    "Como você avalia a dificuldade do treino com ênfase posterior?",
    "Muito fácil|Fácil|Adequado|Difícil|Muito difícil",
  ],
  [
    "Treinamento de força",
    "Você sente mais estabilidade e controle durante os exercícios?",
    "Nunca|Raramente|Às vezes|Frequentemente|Sempre",
  ],
  [
    "Treinamento de força",
    "Você sente desconforto nas articulações durante ou após os exercícios?",
    "Nunca|Raramente|Às vezes|Frequentemente|Sempre",
  ],
  [
    "Condicionamento cardiovascular",
    "Como você avalia a dificuldade do treino cardiovascular?",
    "Muito fácil|Fácil|Adequado|Difícil|Muito difícil",
  ],
  [
    "Condicionamento cardiovascular",
    "Percebe melhora na respiração durante o exercício?",
    "Nenhuma|Pequena|Moderada|Grande|Muito grande",
  ],
  [
    "Condicionamento cardiovascular",
    "Percebe melhora no fôlego em atividades cotidianas?",
    "Nenhuma|Pequena|Moderada|Grande|Muito grande",
  ],
  [
    "Adesão e motivação",
    "Como está sua motivação para continuar treinando?",
    "Muito baixa|Baixa|Moderada|Alta|Muito alta",
  ],
  [
    "Adesão e motivação",
    "Quanto os treinos estão se encaixando na sua rotina?",
    "Nada|Pouco|Razoavelmente|Bem|Muito bem",
  ],
  [
    "Adesão e motivação",
    "Qual seu grau de satisfação com o primeiro mês?",
    "Muito insatisfeita|Insatisfeita|Neutra|Satisfeita|Muito satisfeita",
  ],
  [
    "Adaptação social",
    "Como você se sente no ambiente da academia atualmente?",
    "Muito desconfortável|Desconfortável|Indiferente|Confortável|Muito confortável",
  ],
  [
    "Adaptação social",
    "Você percebe que está mais à vontade na academia em comparação com o primeiro dia?",
    "Não percebo diferença|Um pouco|Moderadamente|Bastante|Completamente",
  ],
  [
    "Adaptação social",
    "Como você avalia sua interação com outras pessoas na academia?",
    "Evito interações|Interajo pouco|Interajo ocasionalmente|Interajo com facilidade|Sinto-me integrada ao ambiente",
  ],
  [
    "Adaptação social",
    "Você sente vergonha, insegurança ou receio de ser observada durante os exercícios?",
    "Nunca|Raramente|Às vezes|Frequentemente|Sempre",
  ],
  [
    "Adaptação social",
    "Como você avalia sua autonomia para circular pela academia e utilizar os equipamentos?",
    "Muito baixa|Baixa|Moderada|Alta|Muito alta",
  ],
  [
    "Adaptação social",
    "Você sente que é respeitada e acolhida pelos profissionais e demais frequentadores da academia?",
    "Nunca|Raramente|Às vezes|Frequentemente|Sempre",
  ],
  [
    "Adaptação social",
    "A convivência com outras pessoas influencia sua motivação para frequentar a academia?",
    "Prejudica muito|Prejudica um pouco|Não influencia|Ajuda um pouco|Ajuda muito",
  ],
  [
    "Adaptação social",
    "Você se sentiria confortável em realizar parte do treinamento sem acompanhamento direto do personal, caso recebesse orientações?",
    "Nada confortável|Pouco confortável|Moderadamente confortável|Confortável|Muito confortável",
  ],
  [
    "Respostas abertas",
    "Em quais exercícios você percebeu maior dificuldade ou facilidade?",
    "",
  ],
  [
    "Respostas abertas",
    "Sentiu alguma dor diferente da dor muscular habitual? Onde, quando e qual intensidade de 0 a 10?",
    "",
  ],
  [
    "Respostas abertas",
    "O que você mais gostou e o que gostaria de mudar nos treinos?",
    "",
  ],
  [
    "Respostas abertas",
    "Qual resultado você mais gostaria de alcançar nos próximos 30 dias?",
    "",
  ],
  [
    "Respostas abertas",
    "Existe alguma situação na academia que ainda provoca desconforto, vergonha ou insegurança?",
    "",
  ],
  [
    "Respostas abertas",
    "O que poderia tornar sua experiência na academia mais agradável e acolhedora?",
    "",
  ],
  [
    "Respostas abertas",
    "Você percebe alguma mudança na sua autoestima, confiança ou maneira de se relacionar desde que começou a treinar?",
    "",
  ],
];
export const initialQuestions = rows.map(([dimension, text, options], i) => ({
  position: i + 1,
  dimension,
  text,
  type: options ? "choice" : "text",
  required: true,
  options: options
    .split("|")
    .filter(Boolean)
    .map((label, position) => ({ label, position })),
}));
export const technicalCriteria = [
  "Coordenação dos movimentos",
  "Controle das fases concêntrica e excêntrica",
  "Estabilidade corporal",
  "Amplitude sem dor",
  "Técnica nas últimas repetições",
  "Tolerância ao volume de treino",
  "Necessidade de correções verbais",
  "Condicionamento cardiovascular",
  "Carga e repetições nos exercícios principais",
  "RPE — esforço percebido de 0 a 10",
  "Tempo, intensidade e distância do cardio",
  "Sessões realizadas e previstas",
  "Fadiga, dor e recuperação",
];
