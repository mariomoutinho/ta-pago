import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Empty, Field, Label, Notice, s } from "@/components/personal/ui";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import { copyPreparedWorkout, workoutTemplateSchema, type WorkoutData, type WorkoutTemplate } from "../../../shared/workouts";
import { identifyWorkout, prescriptionKey, WorkoutEditor } from "./workout-editor";
import { SaveForm } from "./form";
import { PrescriptionView } from "./exercise-view";
import { canPersistExerciseOrder } from "../../../shared/workout-groups";

function PreparedWorkoutForm({ template, done, cancel }: {
  template?: WorkoutTemplate; done: () => void; cancel: () => void;
}) {
  const [data, setData] = useState<WorkoutData>(() => identifyWorkout(template ? copyPreparedWorkout(template) : {
    name: "", subtitle: "", instructions: "", exercises: [],
  }));
  const [revision, setRevision] = useState(template?.revision);
  const [pending, setPending] = useState(false);
  const [discard, setDiscard] = useState(false);
  return <Card>
    <Label size={20} bold>{template ? "Editar treino preparado" : "Criar treino preparado"}</Label>
    <SaveForm label="Salvar treino preparado" cancel={() => setDiscard(true)} save={async () => {
      if (pending) throw new Error("Confirme ou cancele a prescrição aberta antes de salvar.");
      const parsed = workoutTemplateSchema.safeParse({ ...data, revision });
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => issue.message).join(" · "));
      await api(template ? `/workout-templates/${template.id}` : "/workout-templates", template ? "PUT" : "POST", parsed.data);
      done();
    }}>
      <WorkoutEditor workout={data} change={setData} pending={setPending} persistOrder={template && canPersistExerciseOrder(template.exercises, data.exercises) ? async items => {
        const result = await api<{ revision: number }>("/workout-templates/" + template.id + "/order", "PUT", { revision, ids: items.map(prescriptionKey) });
        setRevision(result.revision);
      } : undefined} />
    </SaveForm>
    {discard && <Confirm title="Descartar edição do treino preparado?"
      description="As alterações ainda não foram salvas." onClose={() => setDiscard(false)} onConfirm={async () => cancel()} />}
  </Card>;
}

export function PreparedWorkouts({ select }: { select?: (workout: WorkoutData) => void }) {
  const { data, loading, error, reload } = useResource<WorkoutTemplate[]>("/workout-templates");
  const [editing, setEditing] = useState<WorkoutTemplate | "new" | null>(null);
  const [remove, setRemove] = useState<WorkoutTemplate | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = (data ?? []).filter(template => normalize(template.name).includes(normalize(search)));
  return <View style={{ gap: 12 }}>
    <Label size={22} bold>Treinos preparados</Label>
    <Label muted>{select ? "Selecione um treino para copiar para o plano deste aluno. Você poderá ajustar a cópia antes de salvar." : "Monte treinos com sua biblioteca e reutilize nos planos dos alunos. Alterar um modelo não muda as prescrições já copiadas."}</Label>
    <Notice>{success}</Notice>
    <Notice error>{error}</Notice>
    {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
    {editing ? <PreparedWorkoutForm key={editing === "new" ? "new" : editing.id}
      template={editing === "new" ? undefined : editing} cancel={() => setEditing(null)}
      done={() => { setEditing(null); setSuccess("Treino preparado salvo."); void reload(); }} /> : <>
      {!select && <Button onPress={() => setEditing("new")}>+ Criar treino preparado</Button>}
      <Field label="Buscar treinos preparados" value={search} onChangeText={setSearch} />
      {loading && <Notice>Carregando treinos preparados…</Notice>}
      {!loading && !error && !visible.length && <Empty title={data?.length ? "Nenhum treino encontrado" : "Nenhum treino preparado ainda"}
        description={select ? "Crie modelos na seção Treinos preparados da sua conta de personal." : "Crie seu primeiro treino usando os exercícios da sua biblioteca."} />}
      {visible.map(template => {
        const unavailable = template.exercises.some(item => !item.exercise || item.exercise.status !== "ativo");
        return <Card key={template.id}>
          <Label size={18} bold>{template.name}</Label>
          {!!template.subtitle && <Label muted>{template.subtitle}</Label>}
          <Label muted>{template.exercises.length} exercício(s)</Label>
          {unavailable && <Notice>Este modelo contém exercício indisponível. Edite-o na seção Treinos preparados antes de usar.</Notice>}
          <View style={s.row}>
            <Button variant="secondary" onPress={() => setExpanded(expanded === template.id ? null : template.id)}>
              {expanded === template.id ? "Recolher modelo" : "Ver modelo"}
            </Button>
            {select ? <Button disabled={unavailable} label={`Usar treino ${template.name}`} onPress={() => select(copyPreparedWorkout(template))}>Usar este treino</Button> : <>
              <Button variant="secondary" label={`Editar treino preparado ${template.name}`} onPress={() => { setSuccess(""); setEditing(template); }}>Editar</Button>
              <Button variant="danger" label={`Excluir treino preparado ${template.name}`} onPress={() => setRemove(template)}>Excluir</Button>
            </>}
          </View>
          {expanded === template.id && <View style={{ gap: 12, paddingTop: 12 }}>
            {!!template.instructions && <Notice>{template.instructions}</Notice>}
            {template.exercises.map((item, index) => <PrescriptionView key={index} item={item} />)}
          </View>}
        </Card>;
      })}
    </>}
    {remove && <Confirm title="Excluir treino preparado?" description="As cópias já salvas nos planos dos alunos serão preservadas."
      onClose={() => setRemove(null)} onConfirm={async () => {
        await api(`/workout-templates/${remove.id}`, "DELETE");
        setSuccess("Treino preparado excluído."); await reload();
      }} />}
  </View>;
}
