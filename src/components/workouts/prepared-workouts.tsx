import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Empty, Label, Notice } from "@/components/personal/ui";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import { copyPreparedWorkout, workoutTemplateSchema, type WorkoutData, type WorkoutTemplate } from "../../../shared/workouts";
import { identifyWorkout, prescriptionKey, WorkoutEditor } from "./workout-editor";
import { SaveForm } from "./form";
import { PrescriptionView } from "./exercise-view";
import { canPersistExerciseOrder } from "../../../shared/workout-groups";
import { WorkoutExerciseList } from "./workout-exercise-list";
import { PageHeader } from "../studio/page-header";
import { SearchInput } from "../studio/search-input";
import { StudioAction } from "../studio/controls";
import { WorkoutTemplateCard, WorkoutSkeleton } from "../studio/workout-template-card";
import { DropdownMenu } from "../studio/dropdown-menu";

function PreparedWorkoutForm({ template, done, cancel }: {
  template?: WorkoutTemplate; done: () => void; cancel: () => void;
}) {
  const [data, setData] = useState<WorkoutData>(() => identifyWorkout(template ? copyPreparedWorkout(template) : {
    name: "", subtitle: "", instructions: "", exercises: [],
  }));
  const [revision, setRevision] = useState(template?.revision);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [discard, setDiscard] = useState(false);
  return <Card>
    {!focused && <Label size={20} bold>{template ? "Editar treino preparado" : "Criar treino preparado"}</Label>}
    <SaveForm hideActions={focused} label="Salvar treino preparado" cancel={() => setDiscard(true)} save={async () => {
      if (pending) throw new Error("Confirme ou cancele a prescrição aberta antes de salvar.");
      const parsed = workoutTemplateSchema.safeParse({ ...data, revision });
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => issue.message).join(" · "));
      await api(template ? `/workout-templates/${template.id}` : "/workout-templates", template ? "PUT" : "POST", parsed.data);
      done();
    }}>
      <WorkoutEditor screenChanged={setFocused} workout={data} change={setData} pending={setPending} persistOrder={template && canPersistExerciseOrder(template.exercises, data.exercises) ? async items => {
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
  const [menu, setMenu] = useState<string | null>(null);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = (data ?? []).filter(template => normalize(template.name).includes(normalize(search)));
  return <View style={{ gap: 28, flexGrow: 1 }}>
    {select ? <View style={{ gap: 12 }}><Label size={22} bold>Treinos preparados</Label><Label muted>Selecione um treino para copiar para o plano deste aluno. Você poderá ajustar a cópia antes de salvar.</Label></View> : <PageHeader title="Treinos preparados"
      description="Monte treinos com sua biblioteca e reutilize nos planos dos alunos."
      note="Alterar um modelo não muda as prescrições já copiadas."
      action={!editing ? <StudioAction primary label="+ Criar treino preparado" onPress={() => setEditing("new")}>+  Criar treino preparado</StudioAction> : undefined} />}
    <Notice>{success}</Notice>
    <Notice error>{error}</Notice>
    {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
    {editing ? <PreparedWorkoutForm key={editing === "new" ? "new" : editing.id}
      template={editing === "new" ? undefined : editing} cancel={() => setEditing(null)}
      done={() => { setEditing(null); setSuccess("Treino preparado salvo."); void reload(); }} /> : <>
      <SearchInput label="Buscar treinos preparados" value={search} onChange={setSearch} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4, marginBottom: -12 }}><Label size={19} bold>Seus modelos</Label>{!loading && !error && <Label size={12} muted>{visible.length} {visible.length === 1 ? "modelo" : "modelos"}</Label>}</View>
      {loading && <WorkoutSkeleton />}
      {!loading && !error && !visible.length && <Empty title={data?.length ? "Nenhum treino encontrado" : "Nenhum treino preparado ainda"}
        description={select ? "Crie modelos na seção Treinos preparados da sua conta de personal." : "Crie seu primeiro treino usando os exercícios da sua biblioteca."} />}
      {visible.map(template => {
        const unavailable = template.exercises.some(item => !item.exercise || item.exercise.status !== "ativo");
        return <WorkoutTemplateCard key={template.id} name={template.name} subtitle={template.subtitle} count={template.exercises.length} actions={<>
            <StudioAction onPress={() => setExpanded(expanded === template.id ? null : template.id)}>
              {expanded === template.id ? "Recolher modelo" : "Ver modelo"}
            </StudioAction>
            {select ? <Button disabled={unavailable} label={`Usar treino ${template.name}`} onPress={() => select(copyPreparedWorkout(template))}>Usar este treino</Button> : <>
              <StudioAction label={`Editar treino preparado ${template.name}`} onPress={() => { setSuccess(""); setEditing(template); }}>Editar</StudioAction>
              <DropdownMenu label={template.name} open={menu === template.id} setOpen={value => setMenu(value ? template.id : null)} remove={() => setRemove(template)} />
            </>}
          </>}>
          {unavailable && <Notice>Este modelo contém exercício indisponível. Edite-o na seção Treinos preparados antes de usar.</Notice>}
          {expanded === template.id && <View style={{ gap: 12, paddingTop: 12 }}>
            {!!template.instructions && <Notice>{template.instructions}</Notice>}
            <WorkoutExerciseList items={template.exercises} unmountCollapsed details={item => <PrescriptionView item={item} />} />
          </View>}
        </WorkoutTemplateCard>;
      })}
    </>}
    {remove && <Confirm title="Excluir treino preparado?" description="As cópias já salvas nos planos dos alunos serão preservadas."
      onClose={() => setRemove(null)} onConfirm={async () => {
        await api(`/workout-templates/${remove.id}`, "DELETE");
        setSuccess("Treino preparado excluído."); await reload();
      }} />}
    {!select && !editing && <View style={{ marginTop: "auto", paddingTop: 64 }}><Label size={11} muted>Tá Pago Personal · Presença. Evolução. Resultado.</Label></View>}
  </View>;
}
