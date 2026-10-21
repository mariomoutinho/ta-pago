import { ProfileHeader, ProfileHome, ProfileMenu } from "./profile-home";
import { WorkoutPlans } from "@/components/workouts/plans";
import { useState } from "react";
import { View, ScrollView } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useResource } from "@/features/personal/use-resource";
import {
  api,
  exportStudent,
  formatDate,
  message,
  today,
} from "@/features/personal/api";
import type {
  Student,
  Program,
  Template,
  Evaluation,
  TrackingRecord,
  Criterion,
} from "@/features/personal/types";
import { recordNames, recordFields } from "@/features/personal/fields";
import { studentGroups } from "@/features/personal/student-fields";
import { adherence, type RecordKind } from "../../../shared/validation";
import { technicalCriteria } from "../../../shared/questionnaire";
import { Page } from "./shell";
import {
  Badge,
  Button,
  Card,
  Choices,
  Confirm,
  Dialog,
  Empty,
  Field,
  Label,
  Notice,
  Section,
  s,
} from "./ui";
import { StudentForm, RecordForm } from "./forms";
import { EvaluationForm } from "./evaluation-form";
import { Chart } from "./chart";
const tabs = [
  "Visão geral",
  "Avaliações",
  "Evolução física",
  "Treinos",
  "Treinamentos",
  "Evolução técnica",
  "Adaptação social",
  "Histórico e observações",
];
export function Profile({ studentView = false }: { studentView?: boolean }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const prefix = studentView ? "/me/students" : "/students";
  const {
    data: student,
    error,
    reload,
  } = useResource<Student>(`${prefix}/${id}`);
  const { data: programs } = useResource<Program[]>(
    studentView ? null : "/programs",
  );
  const { data: templates } = useResource<Template[]>(
    studentView ? null : "/templates",
  );
  const [tab, setTab] = useState("Início");
  const [editing, setEditing] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | "new" | null>(null);
  const [record, setRecord] = useState<{
    kind: RecordKind;
    record?: TrackingRecord;
  } | null>(null);
  const [failure, setFailure] = useState("");
  const [invitation, setInvitation] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  if (!student)
    return (
      <Page>
        <Notice error>{error}</Notice>
        {!error && <Notice>Carregando acompanhamento…</Notice>}
        <Button
          variant="secondary"
          onPress={() =>
            router.replace((studentView ? "/" : "/alunos") as Href)
          }
        >
          Voltar
        </Button>
      </Page>
    );
  const lastMonthly = student.records.find((r) => r.kind === "monthly");
  const lastEvaluation = student.evaluations.find(
    (e) => e.status === "concluida",
  );
  const records = (kind: RecordKind) =>
    student.records.filter((r) => r.kind === kind);
  const points = (kind: RecordKind, key: string) =>
    records(kind)
      .slice()
      .reverse()
      .map((r) => ({
        date: r.date,
        value: typeof r.data[key] === "number" ? (r.data[key] as number) : null,
      }));
  const add = (kind: RecordKind) => setRecord({ kind });
  const list = (kind: RecordKind) => (
    <RecordList
      records={records(kind)}
      readonly={studentView}
      onAdd={() => add(kind)}
      onEdit={(r) => setRecord({ kind, record: r })}
      onDelete={(r) =>
        setConfirmation({
          title: "Excluir registro",
          description:
            "O registro sai da visualização. A versão anterior permanece no histórico de correções.",
          run: async () => {
            await api(`/students/${id}/records/${r.id}`, "DELETE");
            await reload();
          },
        })
      }
    />
  );
  const header = (title: string, kind: RecordKind) => (
    <View
      style={[s.row, { justifyContent: "space-between", marginBottom: 18 }]}
    >
      <Label size={20} bold>
        {title}
      </Label>
      {!studentView && (
        <Button onPress={() => add(kind)}>Adicionar registro</Button>
      )}
    </View>
  );
  return (
    <Page resetKey={tab}>
      <ProfileHeader student={student} studentView={studentView} tab={tab} onNavigate={setTab}
        onBack={() => router.push((studentView ? "/" : "/alunos") as Href)} />
      <Notice error>{failure || error}</Notice>
      {student.linkStatus === "ended" && (
        <Notice>
          O acesso do personal foi revogado. Seu histórico continua disponível
          para consulta, exportação ou exclusão.
        </Notice>
      )}
      {tab === "Início" && <ProfileHome student={student} studentView={studentView}
        onNavigate={setTab} onAddNote={() => add("note")} />}
      {tab === "Opções" && <ProfileMenu tabs={tabs} onNavigate={setTab}
        onEdit={studentView ? undefined : () => setEditing(true)} />}
      {tab === "Visão geral" && (
        <>
          <Notice>
            Desde {formatDate(student.startDate)}
            {studentView ? ` · Personal: ${student.personal?.name ?? "—"}` : ""}
          </Notice>
          <View style={s.grid}>
            {[
              ["Objetivo principal", student.mainGoal],
              [
                "Frequência planejada",
                `${student.weeklyFrequency}× por semana`,
              ],
              ["Próxima avaliação", formatDate(student.nextEvaluationDate)],
            ].map(([label, value]) => (
              <Card key={label} style={s.column}>
                <Label muted>{label}</Label>
                <Label size={23} bold>
                  {value}
                </Label>
              </Card>
            ))}
          </View>
          {student.restrictions && (
            <Notice>Recomendações profissionais: {student.restrictions}</Notice>
          )}
          <View style={s.grid}>
            <Card style={s.column}>
              <Label size={19} bold>
                O momento atual
              </Label>
              {lastMonthly ? (
                <View
                  style={[
                    s.row,
                    { justifyContent: "space-between", marginTop: 22 },
                  ]}
                >
                  {[
                    [
                      "Adesão",
                      Number(lastMonthly.data.planned) > 0
                        ? `${adherence(Number(lastMonthly.data.planned), Number(lastMonthly.data.completed))}%`
                        : "Sem previsão",
                    ],
                    ["RPE médio", String(lastMonthly.data.rpe ?? "—")],
                    ["Cardio", `${lastMonthly.data.cardioMinutes} min`],
                  ].map(([label, value]) => (
                    <View key={label}>
                      <Label size={24} bold>
                        {value}
                      </Label>
                      <Label size={11} muted>
                        {label}
                      </Label>
                    </View>
                  ))}
                </View>
              ) : (
                <Empty
                  title="Primeiro ciclo a registrar"
                  description="Adesão, esforço e condicionamento aparecerão aqui."
                  action={
                    !studentView ? (
                      <Button onPress={() => add("monthly")}>
                        Registrar ciclo
                      </Button>
                    ) : undefined
                  }
                />
              )}
              <View style={{ marginTop: 20 }}>
                <Label size={12} muted>
                  Última avaliação:{" "}
                  {lastEvaluation
                    ? formatDate(lastEvaluation.date)
                    : "ainda não realizada"}
                </Label>
              </View>
            </Card>
            <Card style={s.column}>
              <Label size={19} bold>
                Programa vigente
              </Label>
              {student.program ? (
                <Section title={student.program.name}>
                  <Label muted>{student.program.description}</Label>
                  <Label>{student.program.sessions}</Label>
                </Section>
              ) : (
                <Notice>Programa ainda não definido.</Notice>
              )}
              {!studentView && (
                <Button onPress={() => setEvaluation("new")}>
                  Nova avaliação
                </Button>
              )}
            </Card>
          </View>
          <Card>
            <Label size={19} bold>
              Informações do acompanhamento
            </Label>
            {studentGroups.map((group) => (
              <View key={group.title}>
                {group.fields
                  .filter(
                    ([key]) =>
                      ![
                        "name",
                        "startDate",
                        "weeklyFrequency",
                        "mainGoal",
                      ].includes(key),
                  )
                  .map(([key, label]) => {
                    const value = student[key as keyof Student];
                    return typeof value === "string" && value ? (
                      <View key={key} style={{ marginTop: 14 }}>
                        <Label size={12} muted>
                          {label.replace(" *", "")}
                        </Label>
                        <Label>{value}</Label>
                      </View>
                    ) : null;
                  })}
              </View>
            ))}
          </Card>
          <Card>
            <Label size={19} bold>
              Vínculo e privacidade
            </Label>
            <Notice>
              {student.accountId
                ? "O cadastro está associado à conta do aluno. Encerrar o vínculo revoga o acesso do personal sem apagar o histórico."
                : "Este acompanhamento ainda é local ao personal. Gere um convite para o aluno aceitar o vínculo na própria conta."}
            </Notice>
            <View style={s.row}>
              {!studentView && !student.accountId && (
                <Button
                  onPress={async () => {
                    try {
                      const result = await api<{ code: string }>(
                        `/students/${id}/invite`,
                        "POST",
                      );
                      setInvitation(result.code);
                    } catch (e) {
                      setFailure(message(e));
                    }
                  }}
                >
                  Gerar convite
                </Button>
              )}
              <Button
                variant="secondary"
                onPress={async () => {
                  try {
                    await exportStudent(id, studentView);
                  } catch (e) {
                    setFailure(message(e));
                  }
                }}
              >
                Exportar dados
              </Button>
              {student.accountId && student.linkStatus === "active" && (
                <Button
                  variant="secondary"
                  onPress={() =>
                    setConfirmation({
                      title: "Encerrar vínculo",
                      description:
                        "O personal perderá o acesso ao cadastro, avaliações e registros. O aluno continuará podendo consultar seu histórico.",
                      run: async () => {
                        await api(`${prefix}/${id}/revoke`, "POST");
                        if (studentView) await reload();
                        else router.replace("/alunos" as Href);
                      },
                    })
                  }
                >
                  Encerrar vínculo
                </Button>
              )}
              {(studentView || !student.accountId) && (
                <Button
                  variant="danger"
                  onPress={() =>
                    setConfirmation({
                      title: "Excluir todos os dados",
                      description:
                        "O cadastro, avaliações, respostas e histórico deste acompanhamento serão excluídos definitivamente. Exporte uma cópia se precisar preservá-los.",
                      run: async () => {
                        await api(`${prefix}/${id}`, "DELETE");
                        router.replace((studentView ? "/" : "/alunos") as Href);
                      },
                    })
                  }
                >
                  Excluir acompanhamento
                </Button>
              )}
            </View>
          </Card>
        </>
      )}
      {tab === "Avaliações" && (
        <Card>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Label size={20} bold>
              Avaliações periódicas
            </Label>
            {!studentView && (
              <Button onPress={() => setEvaluation("new")}>
                Nova avaliação
              </Button>
            )}
          </View>
          {student.evaluations.length ? (
            student.evaluations.map((e) => (
              <Section
                key={e.id}
                title={`Ciclo ${e.cycle} · ${formatDate(e.date)}`}
              >
                <Badge>
                  {e.status === "concluida" ? "Concluída" : "Rascunho"}
                </Badge>
                <Label muted>
                  {e.template.name} · versão {e.template.version} ·{" "}
                  {e.evaluator}
                </Label>
                <View style={s.row}>
                  <Button variant="secondary" onPress={() => setEvaluation(e)}>
                    {e.status === "concluida"
                      ? "Ver respostas"
                      : studentView
                        ? "Responder questionário"
                        : "Continuar avaliação"}
                  </Button>
                  {!studentView && e.status === "rascunho" && (
                    <Button
                      variant="danger"
                      onPress={() =>
                        setConfirmation({
                          title: "Excluir rascunho",
                          description:
                            "As respostas deste rascunho serão excluídas.",
                          run: async () => {
                            await api(
                              `/students/${id}/evaluations/${e.id}`,
                              "DELETE",
                            );
                            await reload();
                          },
                        })
                      }
                    >
                      Excluir rascunho
                    </Button>
                  )}
                </View>
              </Section>
            ))
          ) : (
            <Empty
              title="Nenhuma avaliação registrada"
              description="O questionário acompanha percepção, adaptação e evolução a cada ciclo."
            />
          )}
        </Card>
      )}
      {tab === "Evolução física" && (
        <>
          <View style={[s.row, { marginBottom: 20 }]}>
            {!studentView && (
              <>
                <Button onPress={() => add("monthly")}>Registrar ciclo</Button>
                <Button variant="secondary" onPress={() => add("physical")}>
                  Registrar medidas
                </Button>
              </>
            )}
          </View>
          <View style={s.grid}>
            <Chart title="Peso (kg)" points={points("physical", "weight")} />
            <Chart title="Cintura (cm)" points={points("physical", "waist")} />
            <Chart
              title="Adesão (%)"
              points={records("monthly")
                .slice()
                .reverse()
                .map((r) => ({
                  date: r.date,
                  value: adherence(
                    Number(r.data.planned),
                    Number(r.data.completed),
                  ),
                }))}
            />
            <Chart
              title="RPE médio (0 a 10)"
              points={points("monthly", "rpe")}
            />
            <Chart
              title="Cardio (minutos)"
              points={points("monthly", "cardioMinutes")}
            />
          </View>
          <Card>
            <Label size={20} bold>
              Evolução mensal
            </Label>
            {list("monthly")}
          </Card>
          <Card>
            <Label size={20} bold>
              Medidas físicas
            </Label>
            {list("physical")}
          </Card>
        </>
      )}
      {tab === "Treinos" && (
        <WorkoutPlans studentId={id} studentView={studentView} />
      )}
      {tab === "Treinamentos" && (
        <Card>
          {header("Treinamentos", "training")}
          <TrainingCharts records={records("training")} />
          {list("training")}
        </Card>
      )}
      {tab === "Evolução técnica" && (
        <Card>
          {header("Evolução técnica", "technical")}
          <TechnicalComparison records={records("technical")} />
          {list("technical")}
        </Card>
      )}
      {tab === "Adaptação social" && (
        <Card>
          {header("Adaptação social e comportamental", "social")}
          {list("social")}
          <Section title="Percepções nos questionários">
            {student.evaluations
              .filter((e) => e.status === "concluida")
              .map((e) => (
                <Card key={e.id}>
                  <Label bold>
                    Ciclo {e.cycle} · {formatDate(e.date)}
                  </Label>
                  {e.template.questions
                    .filter((q) =>
                      [
                        "Adaptação social",
                        "Adesão e motivação",
                        "Recuperação e disposição",
                      ].includes(q.dimension),
                    )
                    .map((q) => (
                      <View key={q.id} style={{ marginTop: 16 }}>
                        <Label size={12} muted>
                          {q.text}
                        </Label>
                        <Label>
                          {e.answers.find((a) => a.questionId === q.id)
                            ?.value ?? "Sem resposta"}
                        </Label>
                      </View>
                    ))}
                </Card>
              ))}
          </Section>
        </Card>
      )}
      {tab === "Histórico e observações" && (
        <>
          <Card>
            {header("Observações profissionais", "note")}
            {list("note")}
          </Card>
          <Card>
            <Label size={20} bold>
              Histórico cronológico
            </Label>
            {student.history.map((h) => (
              <View key={h.id} style={{ marginTop: 20, gap: 7 }}>
                <Label bold>{h.action}</Label>
                <Label size={11} muted>
                  {new Date(h.createdAt).toLocaleString("pt-BR")}
                </Label>
                <HistoricalDetail detail={h.detail} />
              </View>
            ))}
          </Card>
        </>
      )}
      {editing && (
        <Dialog title="Editar cadastro" onClose={() => setEditing(false)}>
          <StudentForm
            student={student}
            programs={programs ?? []}
            onSaved={() => {
              setEditing(false);
              void reload();
            }}
          />
        </Dialog>
      )}
      {record && (
        <Dialog
          title={recordNames[record.kind]}
          onClose={() => setRecord(null)}
        >
          <RecordForm
            studentId={id}
            {...record}
            onSaved={() => {
              setRecord(null);
              void reload();
            }}
          />
        </Dialog>
      )}
      {evaluation && (
        <Dialog
          title="Avaliação periódica"
          onClose={() => {
            setEvaluation(null);
            void reload();
          }}
        >
          <EvaluationForm
            student={student}
            templates={
              evaluation === "new" ? (templates ?? []) : [evaluation.template]
            }
            programs={programs ?? []}
            evaluation={evaluation === "new" ? undefined : evaluation}
            studentView={studentView}
            onSaved={() => {
              setEvaluation(null);
              void reload();
            }}
          />
        </Dialog>
      )}
      {invitation && (
        <Dialog title="Convite para o aluno" onClose={() => setInvitation("")}>
          <Notice>
            Compartilhe este código diretamente com o aluno. Ele expira em 48
            horas e só pode ser usado uma vez.
          </Notice>
          <Field
            label="Código de convite"
            value={invitation}
            editable={false}
            selectTextOnFocus
          />
          <Label muted>
            O aluno deve criar uma conta do tipo “Sou aluno” e usar “Aceitar
            convite” na página inicial.
          </Label>
        </Dialog>
      )}
      {confirmation && (
        <Confirm
          title={confirmation.title}
          description={confirmation.description}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmation.run}
        />
      )}
    </Page>
  );
}
function RecordList({
  records,
  readonly,
  onAdd,
  onEdit,
  onDelete,
}: {
  records: TrackingRecord[];
  readonly: boolean;
  onAdd: () => void;
  onEdit: (r: TrackingRecord) => void;
  onDelete: (r: TrackingRecord) => void;
}) {
  const [expanded, setExpanded] = useState("");
  if (!records.length)
    return (
      <Empty
        title="Nenhum registro neste período"
        description="Os próximos registros formarão o histórico de evolução."
        action={
          !readonly ? (
            <Button variant="secondary" onPress={onAdd}>
              Adicionar registro
            </Button>
          ) : undefined
        }
      />
    );
  return (
    <>
      {records.map((r) => (
        <Section
          key={r.id}
          title={`${formatDate(r.date)}${r.kind === "monthly" ? ` · Ciclo ${r.data.cycle}` : ""}`}
        >
          <RecordValues record={r} />
          {r.kind === "technical" && (
            <>
              <Button
                variant="secondary"
                onPress={() => setExpanded(expanded === r.id ? "" : r.id)}
              >
                Ver os 13 critérios
              </Button>
              {expanded === r.id &&
                (r.data.criteria as Criterion[]).map((c) => (
                  <Card key={c.criterion}>
                    <Label bold>{c.criterion}</Label>
                    {[
                      ["Observação / medida", c.observation],
                      ["Inicial", c.initial],
                      ["Atual", c.current],
                      ["Próxima ação", c.nextAction],
                    ].map(([label, value]) => (
                      <View key={label} style={{ marginTop: 8 }}>
                        <Label size={11} muted>
                          {label}
                        </Label>
                        <Label>{value || "—"}</Label>
                      </View>
                    ))}
                  </Card>
                ))}
            </>
          )}
          {!readonly && (
            <View style={s.row}>
              <Button variant="secondary" onPress={() => onEdit(r)}>
                Editar registro
              </Button>
              <Button variant="danger" onPress={() => onDelete(r)}>
                Excluir registro
              </Button>
            </View>
          )}
        </Section>
      ))}
    </>
  );
}
function RecordValues({ record: r }: { record: TrackingRecord }) {
  return (
    <View style={s.grid}>
      {recordFields[r.kind].map((f) =>
        r.data[f.key] !== null &&
        r.data[f.key] !== "" &&
        r.data[f.key] !== undefined ? (
          <View
            key={f.key}
            style={{ minWidth: 130, flexGrow: 1, marginBottom: 8 }}
          >
            <Label size={11} muted>
              {f.label}
            </Label>
            <Label>{String(r.data[f.key])}</Label>
          </View>
        ) : null,
      )}
      {r.kind === "monthly" && (
        <View>
          <Label size={11} muted>
            Adesão
          </Label>
          <Label>
            {Number(r.data.planned) > 0
              ? `${adherence(Number(r.data.planned), Number(r.data.completed))}%`
              : "Sem previsão"}
          </Label>
        </View>
      )}
    </View>
  );
}
function HistoricalDetail({ detail }: { detail: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const before = (detail as { before?: Record<string, unknown> })?.before;
  if (!before) return null;
  return (
    <>
      <Button variant="secondary" onPress={() => setExpanded(!expanded)}>
        {expanded ? "Ocultar" : "Ver"} versão anterior
      </Button>
      {expanded &&
        (before.kind ? (
          <RecordValues record={before as unknown as TrackingRecord} />
        ) : (
          studentGroups
            .flatMap((g) => g.fields)
            .map(([key, label]) =>
              typeof before[key] === "string" && before[key] ? (
                <View key={key}>
                  <Label size={11} muted>
                    {label.replace(" *", "")}
                  </Label>
                  <Label>{String(before[key])}</Label>
                </View>
              ) : null,
            )
        ))}
    </>
  );
}
function TechnicalComparison({ records }: { records: TrackingRecord[] }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [open, setOpen] = useState(false);
  if (records.length < 2) return null;
  const a = records.find((r) => r.id === first) ?? records[records.length - 1];
  const b = records.find((r) => r.id === second) ?? records[0];
  return (
    <Section title="Comparar períodos">
      <Button variant="secondary" onPress={() => setOpen(!open)}>
        {open ? "Ocultar comparação" : "Comparar avaliações técnicas"}
      </Button>
      {open && (
        <>
          <Choices
            label="Período inicial"
            value={a.id}
            onChange={setFirst}
            options={records.map((r) => ({
              value: r.id,
              label: formatDate(r.date),
            }))}
          />
          <Choices
            label="Período atual"
            value={b.id}
            onChange={setSecond}
            options={records.map((r) => ({
              value: r.id,
              label: formatDate(r.date),
            }))}
          />
          {technicalCriteria.map((c) => (
            <Card key={c}>
              <Label bold>{c}</Label>
              <View style={s.grid}>
                <View style={s.column}>
                  <Label muted>{formatDate(a.date)}</Label>
                  <Label>
                    {(a.data.criteria as Criterion[]).find(
                      (x) => x.criterion === c,
                    )?.current || "—"}
                  </Label>
                </View>
                <View style={s.column}>
                  <Label muted>{formatDate(b.date)}</Label>
                  <Label>
                    {(b.data.criteria as Criterion[]).find(
                      (x) => x.criterion === c,
                    )?.current || "—"}
                  </Label>
                  <Label size={11} muted>
                    Próxima ação:{" "}
                    {(b.data.criteria as Criterion[]).find(
                      (x) => x.criterion === c,
                    )?.nextAction || "—"}
                  </Label>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </Section>
  );
}
function TrainingCharts({ records }: { records: TrackingRecord[] }) {
  const [exercise, setExercise] = useState("");
  const names = [
    ...new Set(
      records
        .filter((r) => r.data.status === "realizado" && r.data.exerciseName)
        .map((r) => String(r.data.exerciseName)),
    ),
  ];
  if (!names.length) return null;
  const selected = names.includes(exercise) ? exercise : names[0];
  const filtered = records
    .filter(
      (r) => r.data.status === "realizado" && r.data.exerciseName === selected,
    )
    .slice()
    .reverse();
  return (
    <>
      <Choices
        label="Comparar o mesmo exercício"
        value={selected}
        onChange={setExercise}
        options={names.map((value) => ({ value, label: value }))}
      />
      <View style={s.grid}>
        {[
          ["loadKg", "Carga (kg)"],
          ["repetitions", "Repetições"],
        ].map(([key, label]) => (
          <Chart
            key={key}
            title={label}
            points={filtered.map((r) => ({
              date: r.date,
              value:
                typeof r.data[key] === "number"
                  ? (r.data[key] as number)
                  : null,
            }))}
          />
        ))}
      </View>
    </>
  );
}
