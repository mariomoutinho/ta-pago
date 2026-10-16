import { useState } from "react";
import { View } from "react-native";
import { templateSchema } from "../../../shared/validation";
import type { Template } from "@/features/personal/types";
import { api, message } from "@/features/personal/api";
import { Button, Card, Choices, Field, Label, Notice, s } from "./ui";
type Question = {
  dimension: string;
  text: string;
  type: "choice" | "text" | "number" | "scale";
  required: boolean;
  options: string;
  min: string;
  max: string;
};
const blank = (): Question => ({
  dimension: "Geral",
  text: "",
  type: "text",
  required: true,
  options: "",
  min: "",
  max: "",
});
export function TemplateForm({
  template,
  onSaved,
}: {
  template?: Template;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [cycle, setCycle] = useState(String(template?.cycleDays ?? 30));
  const [questions, setQuestions] = useState<Question[]>(
    template?.questions.map((q) => ({
      ...q,
      options: q.options.map((o) => o.label).join("\n"),
      min: q.min === null ? "" : String(q.min),
      max: q.max === null ? "" : String(q.max),
    })) ?? [blank()],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function update(i: number, part: Partial<Question>) {
    setQuestions((q) => q.map((x, j) => (i === j ? { ...x, ...part } : x)));
  }
  async function save() {
    setError("");
    const parsed = templateSchema.safeParse({
      name,
      cycleDays: Number(cycle),
      questions: questions.map((q) => ({
        ...q,
        options:
          q.type === "choice"
            ? q.options
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean)
                .map((label) => ({ label }))
            : [],
        min: q.min === "" ? null : Number(q.min),
        max: q.max === "" ? null : Number(q.max),
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }
    setBusy(true);
    try {
      await api("/templates", "POST", parsed.data);
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Field label="Nome do modelo" value={name} onChangeText={setName} />
      <Field
        label="Duração do ciclo (dias)"
        value={cycle}
        onChangeText={setCycle}
        keyboardType="number-pad"
      />
      <Notice>
        As versões anteriores e suas respostas são preservadas. Novos modelos
        ficam disponíveis somente na sua conta.
      </Notice>
      {questions.map((q, i) => (
        <Card key={i}>
          <Label bold>Pergunta {i + 1}</Label>
          <Field
            label="Dimensão"
            value={q.dimension}
            onChangeText={(dimension) => update(i, { dimension })}
          />
          <Field
            label="Enunciado"
            value={q.text}
            onChangeText={(text) => update(i, { text })}
            multiline
          />
          <Choices
            label="Tipo de resposta"
            options={[
              { value: "choice", label: "Objetiva" },
              { value: "text", label: "Aberta" },
              { value: "number", label: "Numérica" },
              { value: "scale", label: "Escala" },
            ]}
            value={q.type}
            onChange={(type) => update(i, { type: type as Question["type"] })}
          />
          {q.type === "choice" && (
            <Field
              label="Opções (uma por linha)"
              value={q.options}
              onChangeText={(options) => update(i, { options })}
              multiline
            />
          )}
          {["number", "scale"].includes(q.type) && (
            <>
              <Field
                label="Mínimo"
                value={q.min}
                onChangeText={(min) => update(i, { min })}
                keyboardType="decimal-pad"
              />
              <Field
                label="Máximo"
                value={q.max}
                onChangeText={(max) => update(i, { max })}
                keyboardType="decimal-pad"
              />
            </>
          )}
          <Choices
            label="Obrigatória"
            value={q.required ? "yes" : "no"}
            options={[
              { value: "yes", label: "Sim" },
              { value: "no", label: "Não" },
            ]}
            onChange={(v) => update(i, { required: v === "yes" })}
          />
          <Button
            variant="secondary"
            disabled={questions.length === 1}
            onPress={() => setQuestions(questions.filter((_, j) => j !== i))}
          >
            Remover pergunta
          </Button>
        </Card>
      ))}
      <View style={s.row}>
        <Button
          variant="secondary"
          onPress={() => setQuestions([...questions, blank()])}
        >
          Adicionar pergunta
        </Button>
        <Button disabled={busy} onPress={() => void save()}>
          Salvar modelo
        </Button>
      </View>
      <Notice error>{error}</Notice>
    </>
  );
}
