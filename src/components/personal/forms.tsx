import { useState } from "react";
import { View } from "react-native";
import { api, message, today } from "@/features/personal/api";
import { studentGroups } from "@/features/personal/student-fields";
import { recordFields, type Descriptor } from "@/features/personal/fields";
import { technicalCriteria } from "../../../shared/questionnaire";
import {
  studentSchema,
  recordSchemas,
  adherence,
  type RecordKind,
} from "../../../shared/validation";
import type {
  Student,
  Program,
  TrackingRecord,
  Criterion,
} from "@/features/personal/types";
import { Button, Card, Choices, Field, Label, Notice, Section, s } from "./ui";
export function Fields({
  fields,
  values,
  setValues,
}: {
  fields: Descriptor[];
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
}) {
  return (
    <>
      {fields.map((f) =>
        f.options ? (
          <Choices
            key={f.key}
            label={f.label}
            options={f.options.map((value) => ({ value, label: value }))}
            value={values[f.key] ?? f.options[0]}
            onChange={(value) => setValues({ ...values, [f.key]: value })}
          />
        ) : (
          <Field
            key={f.key}
            label={f.label + (f.required ? " *" : "")}
            value={values[f.key] ?? ""}
            onChangeText={(value) => setValues({ ...values, [f.key]: value })}
            multiline={f.type === "textarea"}
            keyboardType={
              f.type === "number"
                ? "decimal-pad"
                : f.type === "email"
                  ? "email-address"
                  : "default"
            }
            placeholder={f.type === "date" ? "AAAA-MM-DD" : undefined}
          />
        ),
      )}
    </>
  );
}
export function StudentForm({
  student,
  programs,
  onSaved,
}: {
  student?: Student;
  programs: Program[];
  onSaved: (s: Student) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    student
      ? Object.fromEntries(
          Object.entries(student)
            .filter(
              ([, v]) =>
                typeof v === "string" || typeof v === "number" || v === null,
            )
            .map(([k, v]) => [k, String(v ?? "")]),
        )
      : {
          startDate: today(),
          weeklyFrequency: "3",
          status: "ativo",
          programId: "",
        },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setError("");
    const data = studentSchema.safeParse(values);
    if (!data.success) {
      setError(data.error.issues.map((i) => i.message).join("; "));
      return;
    }
    setBusy(true);
    try {
      onSaved(
        await api<Student>(
          student ? `/students/${student.id}` : "/students",
          student ? "PUT" : "POST",
          data.data,
        ),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice>
        Informações de saúde são opcionais e ficam restritas ao acompanhamento.
        Datas no formato AAAA-MM-DD.
      </Notice>
      {studentGroups.map((g) => (
        <Section title={g.title} key={g.title}>
          <Fields
            fields={g.fields.map(([key, label, type]) => ({
              key,
              label,
              type,
            }))}
            values={values}
            setValues={setValues}
          />
        </Section>
      ))}
      <Choices
        label="Status"
        value={values.status}
        onChange={(status) => setValues({ ...values, status })}
        options={["ativo", "pausado", "inativo"].map((value) => ({
          value,
          label: value,
        }))}
      />
      <Choices
        label="Programa vigente"
        value={values.programId ?? ""}
        onChange={(programId) => setValues({ ...values, programId })}
        options={[
          { value: "", label: "Sem programa" },
          ...programs.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      <Notice error>{error}</Notice>
      <Button disabled={busy} onPress={() => void save()}>
        Salvar aluno
      </Button>
    </>
  );
}
export { ProgramForm } from "../workouts/program-form";
export function RecordForm({
  studentId,
  kind,
  record,
  onSaved,
}: {
  studentId: string;
  kind: RecordKind;
  record?: TrackingRecord;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(record?.date ?? today());
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      recordFields[kind].map((f) => [
        f.key,
        String(record?.data[f.key] ?? f.options?.[0] ?? ""),
      ]),
    ),
  );
  const [criteria, setCriteria] = useState<Criterion[]>(
    (record?.data.criteria as Criterion[]) ??
      technicalCriteria.map((criterion) => ({
        criterion,
        observation: "",
        initial: "",
        current: "",
        nextAction: "",
      })),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setError("");
    const data: Record<string, unknown> = {};
    for (const f of recordFields[kind])
      data[f.key] =
        f.type === "number"
          ? values[f.key] === ""
            ? null
            : Number(values[f.key])
          : (values[f.key] ?? "");
    if (kind === "technical") data.criteria = criteria;
    const parsed = recordSchemas[kind].safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }
    setBusy(true);
    try {
      await api(
        `/students/${studentId}/records${record ? `/${record.id}` : ""}`,
        record ? "PUT" : "POST",
        { kind, date, data: parsed.data },
      );
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
      <Fields
        fields={recordFields[kind]}
        values={values}
        setValues={setValues}
      />
      {kind === "monthly" && (
        <Notice>
          Adesão:{" "}
          {values.planned && values.completed
            ? (adherence(Number(values.planned), Number(values.completed)) ??
              "Sem previsão")
            : "—"}
          {Number(values.planned) > 0 ? "%" : ""}. Calculada a partir das
          sessões realizadas e previstas.
        </Notice>
      )}
      {kind === "technical" && (
        <>
          <Notice>
            Registre observações ou medidas com unidades. Os critérios
            qualitativos não recebem pontuações automáticas.
          </Notice>
          {criteria.map((c, i) => (
            <Card key={c.criterion}>
              <Label bold>
                {i + 1}. {c.criterion}
              </Label>
              {(
                ["observation", "initial", "current", "nextAction"] as const
              ).map((key, j) => (
                <Field
                  key={key}
                  label={
                    [
                      "Observação ou medida",
                      "Resultado inicial",
                      "Resultado atual",
                      "Próxima ação",
                    ][j]
                  }
                  value={c[key]}
                  multiline
                  onChangeText={(text) =>
                    setCriteria(
                      criteria.map((item, index) =>
                        index === i ? { ...item, [key]: text } : item,
                      ),
                    )
                  }
                />
              ))}
            </Card>
          ))}
        </>
      )}
      <Notice error>{error}</Notice>
      <Button disabled={busy} onPress={() => void save()}>
        Salvar registro
      </Button>
    </>
  );
}
