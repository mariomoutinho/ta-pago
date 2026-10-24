import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button, Card, Confirm, Dialog, Field, Label, Notice, s } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
import { api, message } from "@/features/personal/api";
import { useResource } from "@/features/personal/use-resource";
import { prescriptionSchema, prescriptionSettingsSchema, type Exercise, type Prescription, type PrescriptionPreset, type WorkoutData } from "../../../shared/workouts";
import { TextFields } from "./form";
import { ExerciseLibrary } from "./exercise-library";
import { PrescriptionForm } from "./prescription-form";
import { PrescriptionView } from "./exercise-view";
import { SeriesEditor } from "./series-editor";
import { WorkoutExerciseList, type WorkoutChange } from "./workout-exercise-list";
import { removeExercises } from "../../../shared/workout-groups";
export function move<T>(items: T[], index: number, step: number) {
  const next = [...items];
  if (index + step < 0 || index + step >= next.length) return next;
  const [item] = next.splice(index, 1); next.splice(index + step, 0, item);
  return next;
}
let sequence = 0;
export const prescriptionKey = (item: Prescription) => item.id ?? item.clientId!;
export function identifyWorkout(workout: WorkoutData): WorkoutData {
  return { ...workout, exercises: workout.exercises.map(item => ({ ...item, clientId: item.clientId ?? item.id ?? `draft-${Date.now()}-${++sequence}` })) };
}
export function WorkoutEditor({ workout, change, pending, initialPicker = false, persistOrder }: {
  initialPicker?: boolean; workout: WorkoutData; change: (w: WorkoutData) => void; pending: (value: boolean) => void;
  persistOrder?: (items: Prescription[]) => Promise<void>;
}) {
  const t = useTheme();
  const latestWorkout = useRef(workout);
  latestWorkout.current = workout;
  const [picker, setPicker] = useState<"add" | "replace" | "alternative" | null>(initialPicker ? "add" : null);
  const [target, setTarget] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ item: Prescription; key: string | null } | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [preset, setPreset] = useState<"save" | "load" | null>(null);
  const [name, setName] = useState("");
  const [replacement, setReplacement] = useState<Exercise | null>(null);
  const dirty = useRef(new Set<string>());
  const [hasDirty, setHasDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const presets = useResource<PrescriptionPreset[]>(preset === "load" ? "/prescription-presets" : null);
  const active = workout.exercises.find(item => prescriptionKey(item) === target);
  const disabled = hasDirty || busy || !!edit || !!picker || !!preset;
  const update = (key: string, next: Prescription) => change({ ...workout, exercises: workout.exercises.map(item => prescriptionKey(item) === key ? next : item) });
  const closeOperation = () => { setPicker(null); setPreset(null); setTarget(null); pending(false); };
  async function changeList(exercises: Prescription[], operation: WorkoutChange) {
    if (disabled || lock.current) return;
    if (operation !== "order") {
      change({ ...workout, exercises });
      setSuccess("Alterações prontas. Salve o formulário para gravar o treino.");
      return;
    }
    const before = workout;
    lock.current = true; setBusy(true); pending(true); setError(""); setSuccess("");
    change({ ...workout, exercises });
    try { await persistOrder?.(exercises); setSuccess(persistOrder ? "Ordem salva." : "Ordem alterada. Salve o formulário para gravar este rascunho."); }
    catch (e) { change({ ...latestWorkout.current, exercises: before.exercises }); setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); pending(false); }
  }
  function action(value: string) {
    setTarget(menu); setMenu(null); setError(""); setSuccess("");
    if (value === "Excluir") { setRemove(menu); return; }
    pending(true);
    if (value === "Trocar exercício") setPicker("replace");
    if (value === "Adicionar exercício alternativo") setPicker("alternative");
    if (value === "Adicionar preset") setPreset("load");
    if (value === "Salvar como preset") { setName(""); setPreset("save"); }
  }
  return <View style={{ gap: 12 }}>
    <TextFields value={workout} change={change} fields={[["name", "Nome do treino *"], ["subtitle", "Subtítulo"], ["instructions", "Orientações do treino"]]} />
    <Notice error>{error}</Notice><Notice>{success}</Notice>
    {!workout.exercises.length && <Label muted>Este treino ainda não possui exercícios.</Label>}
    <WorkoutExerciseList items={workout.exercises} disabled={disabled} change={changeList} itemMenu={setMenu} details={(item) => {
      const key = prescriptionKey(item);
      return <>
        <PrescriptionView item={item} />
        <Button disabled={disabled} variant="secondary" onPress={() => { setEdit({ item, key }); pending(true); }}>Editar prescrição</Button>
        <SeriesEditor key={JSON.stringify([item.series, item.sets, item.repetitions, item.load, item.restSeconds])} item={item} draft disabled={busy || !!edit || !!picker || !!preset} onDirty={value => { value ? dirty.current.add(key) : dirty.current.delete(key); setHasDirty(dirty.current.size > 0); pending(dirty.current.size > 0); }} save={async series => { update(key, { ...item, series }); }} />
      </>;
    }} />
    {edit && <Card><PrescriptionForm item={edit.item} cancel={() => { setEdit(null); pending(false); }} done={item => {
      if (edit.key) update(edit.key, item);
      else change({ ...workout, exercises: [...workout.exercises, identifyWorkout({ ...workout, exercises: [item] }).exercises[0]] });
      setEdit(null); pending(false);
    }} /></Card>}
    {picker ? <Card>
      <Label size={20} bold>{picker === "add" ? "Adicionar exercício" : picker === "replace" ? "Trocar exercício" : "Adicionar exercício alternativo"}</Label>
      <Button variant="secondary" onPress={closeOperation}>Fechar biblioteca</Button>
      <ExerciseLibrary select={exercise => {
        if (picker === "add") { setEdit({ item: { ...prescriptionSchema.parse({ exerciseId: exercise.id }), exercise }, key: null }); setPicker(null); }
        else if (active && picker === "replace") setReplacement(exercise);
        else if (active) {
          if (exercise.id === active.exerciseId) { setError("Selecione uma alternativa diferente do exercício principal."); return; }
          update(target!, { ...active, alternativeExerciseId: exercise.id, alternativeExercise: exercise }); closeOperation();
        }
      }} />
    </Card> : !edit && <Button disabled={disabled} onPress={() => { setPicker("add"); pending(true); }}>+ Adicionar exercício</Button>}
    {replacement && active && <Confirm title="Trocar exercício?" description={"Substituir " + active.exercise?.name + " por " + replacement.name + "? A prescrição será mantida. Revise sua compatibilidade antes de salvar."} onClose={() => setReplacement(null)} onConfirm={async () => { update(target!, { ...active, exerciseId: replacement.id, exercise: replacement, alternativeExerciseId: null, alternativeExercise: null }); closeOperation(); }} />}
    {remove && <Confirm title="Remover exercício?" description={"Remover " + workout.exercises.find(item => prescriptionKey(item) === remove)?.exercise?.name + " deste treino? A biblioteca será preservada. A remoção será gravada ao salvar o formulário."} onClose={() => setRemove(null)} onConfirm={async () => change({ ...workout, exercises: removeExercises(workout.exercises, new Set([remove])) })} />}
    {menu && <Modal transparent visible animationType="none" onRequestClose={() => setMenu(null)}>
      <Pressable accessibilityLabel="Fechar menu de ações" onPress={() => setMenu(null)} style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Pressable onPress={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "90%", padding: 16, borderRadius: 18, backgroundColor: t.background }}>
          <ScrollView><Label bold>Ações do exercício</Label>{["Trocar exercício", "Adicionar preset", "Salvar como preset", "Adicionar exercício alternativo", "Excluir"].map(value => <View key={value} style={{ marginTop: 8 }}><Button variant={value === "Excluir" ? "danger" : "secondary"} onPress={() => action(value)}>{value}</Button></View>)}<Button variant="secondary" onPress={() => setMenu(null)}>Fechar menu</Button></ScrollView>
        </Pressable>
      </Pressable>
    </Modal>}
    {preset && active && <Dialog title={preset === "save" ? "Salvar preset" : "Adicionar preset"} onClose={() => { if (!busy) closeOperation(); }}>
      <Notice error>{error || presets.error}</Notice>
      {preset === "save" ? <><Field label="Nome do preset" value={name} onChangeText={setName} /><Button disabled={busy || !name.trim()} onPress={async () => {
        setBusy(true); setError("");
        try { await api("/prescription-presets", "POST", { name, series: active.series, configuration: prescriptionSettingsSchema.parse(active) }); closeOperation(); setSuccess("Preset salvo."); }
        catch (e) { setError(message(e)); } finally { setBusy(false); }
      }}>Salvar preset</Button></> : <>
        {presets.loading && <Notice>Carregando presets…</Notice>}
        {!presets.loading && !presets.data?.length && <Notice>Nenhum preset cadastrado.</Notice>}
        {presets.error && <Button onPress={() => void presets.reload()}>Tentar novamente</Button>}
        <Label muted>Aplicar um preset substitui a configuração atual. Confira a prescrição antes de salvar.</Label>
        {presets.data?.map(value => <Button key={value.id} variant="secondary" onPress={() => { update(target!, { ...active, ...(value.configuration ?? {}), series: value.series.map(row => ({ ...row })) }); closeOperation(); }}>{value.name}</Button>)}
      </>}
    </Dialog>}
  </View>;
}
