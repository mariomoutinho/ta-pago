import { useState } from "react";
import { View } from "react-native";
import { api, message, today } from "@/features/personal/api";
import { useSession } from "@/features/personal/auth";
import type {
  Student,
  Template,
  Evaluation,
  Program,
} from "@/features/personal/types";
import { useTheme } from "@/hooks/use-theme";
import {
  Button,
  Choices,
  Confirm,
  Field,
  Label,
  Notice,
  Section,
  s,
} from "./ui";
export function EvaluationForm({
  student,
  templates,
  programs,
  evaluation,
  onSaved,
  studentView = false,
}: {
  student: Student;
  templates: Template[];
  programs: Program[];
  evaluation?: Evaluation;
  onSaved: () => void;
  studentView?: boolean;
}) {
  const { user } = useSession();
  const t = useTheme();
  const [templateId, setTemplateId] = useState(
    evaluation?.templateId ?? templates[0]?.id ?? "",
  );
  const template =
    evaluation?.template ?? templates.find((x) => x.id === templateId);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(
      evaluation?.answers.map((a) => [a.questionId, a.value]) ?? [],
    ),
  );
  const [date, setDate] = useState(evaluation?.date ?? today());
  const [cycle, setCycle] = useState(
    String(
      evaluation?.cycle ??
        Math.max(0, ...student.evaluations.map((e) => e.cycle)) + 1,
    ),
  );
  const [evaluator, setEvaluator] = useState(
    evaluation?.evaluator ?? user?.name ?? "",
  );
  const [programId, setProgramId] = useState(
    evaluation?.programId ?? student.programId ?? "",
  );
  const [notes, setNotes] = useState(evaluation?.notes ?? "");
  const [conclusion, setConclusion] = useState(evaluation?.conclusion ?? "");
  const [actionPlan, setActionPlan] = useState(evaluation?.actionPlan ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState(evaluation?.id);
  const [dimension, setDimension] = useState("");
  const [confirm, setConfirm] = useState(false);
  const readonly =
    evaluation?.status === "concluida" ||
    (studentView && student.linkStatus === "ended");
  const dimensions = [...new Set(template?.questions.map((q) => q.dimension))];
  const current = dimensions.includes(dimension) ? dimension : dimensions[0];
  const answered =
    template?.questions.filter((q) => answers[q.id]?.trim()).length ?? 0;
  async function save(status: "rascunho" | "concluida") {
    setError("");
    setSaved("");
    setBusy(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      const result = studentView
        ? await api<Evaluation>(
            `/me/students/${student.id}/evaluations/${id}`,
            "PUT",
            { answers: answerList },
          )
        : await api<Evaluation>(
            `/students/${student.id}/evaluations${id ? `/${id}` : ""}`,
            id ? "PUT" : "POST",
            {
              templateId,
              date,
              cycle: Number(cycle),
              evaluator,
              programId,
              status,
              notes,
              conclusion,
              actionPlan,
              answers: answerList,
            },
          );
      setId(result.id);
      setSaved(
        studentView
          ? "Respostas salvas para revisão do personal."
          : "Rascunho salvo no banco de dados.",
      );
      if (status === "concluida") onSaved();
    } catch (e) {
      setError(message(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  if (!template)
    return <Notice>Crie um modelo de avaliação antes de começar.</Notice>;
  return (
    <>
      {!id && !studentView && (
        <Choices
          label="Modelo"
          value={templateId}
          onChange={(value) => {
            setTemplateId(value);
            setAnswers({});
            setDimension("");
          }}
          options={templates.map((x) => ({
            value: x.id,
            label: `${x.name} · v${x.version}`,
          }))}
        />
      )}
      <Label bold>
        {template.name} · versão {template.version}
      </Label>
      {!readonly && !studentView ? (
        <>
          <Field
            label="Data (AAAA-MM-DD)"
            value={date}
            onChangeText={setDate}
          />
          <Field
            label="Ciclo"
            value={cycle}
            onChangeText={setCycle}
            keyboardType="number-pad"
          />
          <Field
            label="Avaliador"
            value={evaluator}
            onChangeText={setEvaluator}
          />
          <Choices
            label="Programa associado"
            value={programId}
            onChange={setProgramId}
            options={[
              { value: "", label: "Sem programa" },
              ...programs.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </>
      ) : (
        <Notice>
          Ciclo {cycle} · {date} · {evaluator}
        </Notice>
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: template.questions.length,
          now: answered,
        }}
        style={{
          height: 7,
          borderRadius: 5,
          backgroundColor: t.backgroundSelected,
          marginVertical: 16,
        }}
      >
        <View
          style={{
            height: 7,
            borderRadius: 5,
            backgroundColor: t.accent,
            width: `${(answered / template.questions.length) * 100}%`,
          }}
        />
      </View>
      <Label size={12} muted>
        {answered} de {template.questions.length} perguntas respondidas
      </Label>
      <Choices
        label="Dimensão"
        value={current}
        onChange={setDimension}
        options={dimensions.map((d) => ({ value: d, label: d }))}
      />
      {template.questions
        .filter((q) => q.dimension === current)
        .map((q) => (
          <Section
            key={q.id}
            title={`${q.position}. ${q.text}${q.required ? " *" : ""}`}
          >
            {readonly ? (
              <Label>{answers[q.id] || "Sem resposta"}</Label>
            ) : q.type === "choice" ? (
              <Choices
                label={`Resposta ${q.position}`}
                value={answers[q.id] ?? ""}
                onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                options={q.options.map((o) => ({
                  value: o.label,
                  label: o.label,
                }))}
              />
            ) : (
              <Field
                label={
                  q.type === "text"
                    ? "Resposta livre"
                    : `Resposta numérica (${q.min ?? "sem mínimo"} a ${q.max ?? "sem máximo"})`
                }
                value={answers[q.id] ?? ""}
                onChangeText={(value) =>
                  setAnswers({ ...answers, [q.id]: value })
                }
                multiline={q.type === "text"}
                keyboardType={q.type === "text" ? "default" : "decimal-pad"}
              />
            )}
          </Section>
        ))}
      {!studentView && !readonly ? (
        <>
          <Field
            label="Observações profissionais"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Field
            label="Conclusão profissional"
            value={conclusion}
            onChangeText={setConclusion}
            multiline
          />
          <Field
            label="Plano de ação"
            value={actionPlan}
            onChangeText={setActionPlan}
            multiline
          />
        </>
      ) : (
        <>
          <Section title="Conclusão profissional">
            <Label>{conclusion || "Ainda não registrada"}</Label>
          </Section>
          <Section title="Plano de ação">
            <Label>{actionPlan || "Ainda não registrado"}</Label>
          </Section>
        </>
      )}
      {readonly && evaluation?.programSnapshot && (
        <Section title="Programa na data da avaliação">
          <Label>{JSON.parse(evaluation.programSnapshot).name}</Label>
          <Label muted>{JSON.parse(evaluation.programSnapshot).sessions}</Label>
        </Section>
      )}
      <Notice error>{error}</Notice>
      <Notice>{saved}</Notice>
      {!readonly && (
        <View style={s.row}>
          <Button
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void save("rascunho").catch(() => {});
            }}
          >
            {studentView ? "Salvar respostas" : "Salvar rascunho"}
          </Button>
          {!studentView && (
            <Button disabled={busy} onPress={() => setConfirm(true)}>
              Concluir avaliação
            </Button>
          )}
        </View>
      )}
      {confirm && (
        <Confirm
          title="Concluir avaliação"
          description="As respostas serão preservadas e a próxima avaliação será prevista conforme a duração do ciclo. Avaliações concluídas não podem ser sobrescritas."
          onClose={() => setConfirm(false)}
          onConfirm={() => save("concluida")}
        />
      )}
    </>
  );
}
