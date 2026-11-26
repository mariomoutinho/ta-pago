import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Dialog, Empty, Field, Label, Notice } from "@/components/personal/ui";
import { useResource } from "@/features/personal/use-resource";
import { api, message } from "@/features/personal/api";
import { copyPreparedWorkout, workoutTemplateSchema, type WorkoutData, type WorkoutTemplate, type WorkoutFolder } from "../../../shared/workouts";
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

function PreparedWorkoutForm({ template, done, cancel, clone = false, folderId = null }: {
  template?: WorkoutTemplate; done: () => void; cancel: () => void; clone?: boolean; folderId?: string | null;
}) {
  const [data, setData] = useState<WorkoutData>(() => identifyWorkout(template ? { ...copyPreparedWorkout(template), ...(clone ? { name: template.name.slice(0, 152) + " (clone)" } : { exercises: template.exercises }) } : {
    name: "", subtitle: "", instructions: "", exercises: [],
  }));
  const [revision, setRevision] = useState(clone ? undefined : template?.revision);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [discard, setDiscard] = useState(false);
  return <Card>
    {!focused && <Label size={20} bold>{clone ? "Clonar treino" : template ? "Editar treino" : "Criar treino"}</Label>}
    <SaveForm hideActions={focused} label="Salvar treino" cancel={() => setDiscard(true)} save={async () => {
      if (pending) throw new Error("Confirme ou cancele a prescrição aberta antes de salvar.");
      const parsed = workoutTemplateSchema.safeParse({ ...data, revision, folderId: template?.folderId ?? folderId });
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => issue.message).join(" · "));
      await api(template && !clone ? `/workout-templates/${template.id}` : "/workout-templates", template && !clone ? "PUT" : "POST", parsed.data);
      done();
    }}>
      <WorkoutEditor screenChanged={setFocused} workout={data} change={setData} pending={setPending} persistOrder={template && !clone && canPersistExerciseOrder(template.exercises, data.exercises) ? async items => {
        const result = await api<{ revision: number }>("/workout-templates/" + template.id + "/order", "PUT", { revision, ids: items.map(prescriptionKey) });
        setRevision(result.revision);
      } : undefined} />
    </SaveForm>
    {discard && <Confirm title="Descartar edição do treino?"
      description="As alterações ainda não foram salvas." onClose={() => setDiscard(false)} onConfirm={async () => cancel()} />}
  </Card>;
}

export function PreparedWorkouts({ select }: { select?: (workout: WorkoutData) => void }) {
  const { data, loading, error, reload } = useResource<WorkoutTemplate[]>("/workout-templates");
  const folders = useResource<WorkoutFolder[]>("/workout-templates/folders");
  const [folder, setFolder] = useState<string | null>("all");
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [move, setMove] = useState<WorkoutTemplate | null>(null);
  const [clone, setClone] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<WorkoutTemplate | "new" | null>(null);
  const [remove, setRemove] = useState<WorkoutTemplate | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = (data ?? []).filter(template => (folder === "all" || (template.folderId ?? null) === folder) && normalize(template.name).includes(normalize(search)));
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setActionError("");
    try { await action(); } catch (error) { setActionError(message(error)); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 28, flexGrow: 1 }}>
    {select ? <View style={{ gap: 12 }}><Label size={22} bold>Catálogo de treinos</Label><Label muted>Selecione um treino para copiar para o plano deste aluno. Você poderá ajustar a cópia antes de salvar.</Label></View> : <PageHeader title="Catálogo de treinos"
      description="Monte treinos com sua biblioteca e reutilize nos planos dos alunos."
      note="Alterar um modelo não muda as prescrições já copiadas."
      action={!editing ? <StudioAction primary label="+ Criar treino" onPress={() => { setClone(false); setEditing("new"); }}>+ Criar treino</StudioAction> : undefined} />}
    <Notice>{success}</Notice>
    <Notice error>{error}</Notice>
    <Notice error>{actionError || folders.error}</Notice>
    {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
    {editing ? <PreparedWorkoutForm key={editing === "new" ? "new" : editing.id}
      template={editing === "new" ? undefined : editing} clone={clone} folderId={folder === "all" ? null : folder} cancel={() => setEditing(null)}
      done={() => { setEditing(null); setSuccess("Treino salvo."); void reload(); }} /> : <>
      <SearchInput label="Buscar treinos do catálogo" value={search} onChange={setSearch} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button variant={folder === "all" ? "primary" : "secondary"} onPress={() => setFolder("all")}>Todos</Button>
        <Button variant={folder === null ? "primary" : "secondary"} onPress={() => setFolder(null)}>Sem pasta</Button>
        {(folders.data ?? []).map(item => <Button key={item.id} variant={folder === item.id ? "primary" : "secondary"} label={`Abrir pasta ${item.name}`} onPress={() => setFolder(item.id)}>{item.name}</Button>)}
        {!select && <Button variant="secondary" onPress={() => { setFolderName(""); setNewFolder(true); }}>+ Criar pasta</Button>}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4, marginBottom: -12 }}><Label size={19} bold>Seus modelos</Label>{!loading && !error && <Label size={12} muted>{visible.length} {visible.length === 1 ? "modelo" : "modelos"}</Label>}</View>
      {loading && <WorkoutSkeleton />}
      {!loading && !error && !visible.length && <Empty title={data?.length ? "Nenhum treino encontrado" : "Nenhum treino ainda"}
        description={select ? "Crie modelos na seção Catálogo de treinos da sua conta de personal." : "Crie seu primeiro treino usando os exercícios da sua biblioteca."} />}
      {visible.map(template => {
        const unavailable = template.exercises.some(item => !item.exercise || item.exercise.status !== "ativo");
        return <WorkoutTemplateCard key={template.id} name={template.name} subtitle={template.subtitle} count={template.exercises.length} actions={<>
            <StudioAction onPress={() => setExpanded(expanded === template.id ? null : template.id)}>
              {expanded === template.id ? "Recolher modelo" : "Ver modelo"}
            </StudioAction>
            {select ? <Button disabled={unavailable} label={`Usar treino ${template.name}`} onPress={() => select(copyPreparedWorkout(template))}>Usar este treino</Button> : <>
              <StudioAction label={`Editar treino ${template.name}`} onPress={() => { setClone(false); setSuccess(""); setEditing(template); }}>Editar</StudioAction>
              <DropdownMenu label={template.name} open={menu === template.id} setOpen={value => setMenu(value ? template.id : null)} remove={() => setRemove(template)}
                clone={() => { setClone(true); setEditing(template); }} move={() => setMove(template)}
                duplicate={() => void run(async () => { await api(`/workout-templates/${template.id}/duplicate`, "POST", {}); setSuccess("Treino duplicado."); await reload(); })} />
            </>}
          </>}>
          <Label size={12} muted>{folders.data?.find(item => item.id === template.folderId)?.name ?? "Sem pasta"}</Label>
          {unavailable && <Notice>Este modelo contém exercício indisponível. Edite-o na seção Catálogo de treinos antes de usar.</Notice>}
          {expanded === template.id && <View style={{ gap: 12, paddingTop: 12 }}>
            {!!template.instructions && <Notice>{template.instructions}</Notice>}
            <WorkoutExerciseList items={template.exercises} unmountCollapsed details={item => <PrescriptionView item={item} />} />
          </View>}
        </WorkoutTemplateCard>;
      })}
    </>}
    {remove && <Confirm title="Excluir treino?" description="As cópias já salvas nos planos dos alunos serão preservadas."
      onClose={() => setRemove(null)} onConfirm={async () => {
        await api(`/workout-templates/${remove.id}`, "DELETE");
        setSuccess("Treino excluído."); await reload();
      }} />}
    {newFolder && <Dialog title="Criar pasta" onClose={() => setNewFolder(false)}><SaveForm label="Salvar pasta" cancel={() => setNewFolder(false)} save={async () => {
      const created = await api<WorkoutFolder>("/workout-templates/folders", "POST", { name: folderName });
      await folders.reload(); setFolder(created.id); setNewFolder(false);
    }}><Field label="Nome da pasta" value={folderName} onChangeText={setFolderName} /></SaveForm></Dialog>}
    {move && <Dialog title={`Trocar de pasta: ${move.name}`} onClose={() => { if (!busy) setMove(null); }}>
      <Notice error>{actionError}</Notice>
      {[{ id: null, name: "Sem pasta" }, ...(folders.data ?? [])].map(item => <Button key={item.id ?? "root"} variant="secondary" disabled={busy} label={`Mover para ${item.name}`} onPress={() => void run(async () => {
        await api(`/workout-templates/${move.id}/folder`, "PUT", { folderId: item.id, revision: move.revision });
        setMove(null); setSuccess("Pasta do treino atualizada."); await reload();
      })}>{item.name}</Button>)}
    </Dialog>}
    {!select && !editing && <View style={{ marginTop: "auto", paddingTop: 64 }}><Label size={11} muted>Tá Pago Personal · Presença. Evolução. Resultado.</Label></View>}
  </View>;
}
