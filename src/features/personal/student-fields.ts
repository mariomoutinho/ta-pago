export const studentGroups = [
  {
    title: "Dados pessoais",
    fields: [
      ["name", "Nome completo *", "text"],
      ["birthDate", "Data de nascimento", "date"],
      ["phone", "Telefone", "tel"],
      ["email", "E-mail", "email"],
      ["sex", "Sexo, quando relevante", "text"],
      ["startDate", "Início do acompanhamento *", "date"],
    ],
  },
  {
    title: "Acompanhamento",
    fields: [
      ["mainGoal", "Objetivo principal *", "text"],
      ["secondaryGoals", "Objetivos secundários", "textarea"],
      ["experience", "Experiência anterior com musculação", "textarea"],
      ["weeklyFrequency", "Frequência semanal planejada *", "number"],
      ["availability", "Disponibilidade para treinamento", "text"],
      ["nextEvaluationDate", "Próxima avaliação prevista", "date"],
      ["notes", "Observações profissionais", "textarea"],
    ],
  },
  {
    title: "Saúde e segurança · preenchimento opcional",
    fields: [
      ["injuries", "Histórico de lesões", "textarea"],
      ["limitations", "Limitações funcionais", "textarea"],
      ["surgeries", "Cirurgias relevantes", "textarea"],
      ["conditions", "Condições de saúde informadas", "textarea"],
      ["medications", "Medicamentos pertinentes ao exercício", "textarea"],
      ["restrictions", "Restrições ou recomendações profissionais", "textarea"],
      ["emergencyContact", "Contato de emergência", "text"],
    ],
  },
];
