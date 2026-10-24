import { useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Dialog, Field, Label, Notice } from "@/components/personal/ui";
import { api, message } from "@/features/personal/api";
import { useResource } from "@/features/personal/use-resource";
import { prescriptionSchema, prescriptionSettingsSchema, type Exercise, type Prescription, type PrescriptionPreset, type WorkoutData } from "../../../shared/workouts";
import { TextFields } from "./form";
import { ExerciseLibrary } from "./exercise-library";
import { PrescriptionForm } from "./prescription-form";
import { PrescriptionView } from "./exercise-view";
import { SeriesEditor } from "./series-editor";
import { WorkoutExerciseList, type WorkoutChange } from "./workout-exercise-list";
import { insertExerciseInGroup } from "../../../shared/workout-groups";
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
export function WorkoutEditor({ workout, change, pending, initialPicker = false, initialGroup, persistOrder }: {
  initialGroup?: string; initialPicker?: boolean; workout: WorkoutData; change: (w: WorkoutData) => void; pending: (value: boolean) => void;
  persistOrder?: (items: Prescription[]) => Promise<void>;
}) {
  const latestWorkout = useRef(workout);
  useLayoutEffect(() => { latestWorkout.current = workout; }, [workout]);
  const [picker, setPicker] = useState<"add" | "group" | "replace" | "alternative" | null>(initialPicker ? initialGroup ? "group" : "add" : null);
  const [target, setTarget] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ item: Prescription; key: string | null } | null>(null);
  const [pickerGroup, setPickerGroup] = useState<string | undefined>(initialGroup);
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
  function action(key: string, value: string) {
    setTarget(key); setError(""); setSuccess("");
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
    <WorkoutExerciseList items={workout.exercises} disabled={disabled} change={changeList} itemMenu={action} editItem={key => { setEdit({ item: workout.exercises.find(item => prescriptionKey(item) === key)!, key }); pending(true); }} addToGroup={groupId => { setPickerGroup(groupId); setPicker("group"); pending(true); }} normalActions={!picker && !edit && <Button disabled={disabled} onPress={() => { setPickerGroup(undefined); setPicker("add"); pending(true); }}>+ Adicionar exercício</Button>} details={(item) => {
      const key = prescriptionKey(item);
      return <>
        <PrescriptionView item={item} />
        <Button disabled={disabled} variant="secondary" onPress={() => { setEdit({ item, key }); pending(true); }}>Editar prescrição</Button>
        <SeriesEditor key={JSON.stringify([item.series, item.sets, item.repetitions, item.load, item.restSeconds])} item={item} draft disabled={busy || !!edit || !!picker || !!preset} onDirty={value => { if (value) dirty.current.add(key); else dirty.current.delete(key); setHasDirty(dirty.current.size > 0); pending(dirty.current.size > 0); }} save={async series => { update(key, { ...item, series }); }} />
      </>;
    }} />
    {edit && <Card><PrescriptionForm item={edit.item} cancel={() => { setEdit(null); pending(false); }} done={item => {
      if (edit.key) update(edit.key, item);
      else {
        const identified = identifyWorkout({ ...workout, exercises: [item] }).exercises[0];
        change({ ...workout, exercises: pickerGroup ? insertExerciseInGroup(workout.exercises, identified, pickerGroup) : [...workout.exercises, identified] });
      }
      setEdit(null); pending(false);
    }} /></Card>}
    {picker ? <Card>
      <Label size={20} bold>{picker === "add" || picker === "group" ? "Adicionar exercício" : picker === "replace" ? "Trocar exercício" : "Adicionar exercício alternativo"}</Label>
      <Button variant="secondary" onPress={closeOperation}>Fechar biblioteca</Button>
      <ExerciseLibrary select={exercise => {
        if (picker === "add" || picker === "group") { setEdit({ item: { ...prescriptionSchema.parse({ exerciseId: exercise.id, groupId: picker === "group" ? pickerGroup : null }), exercise }, key: null }); setPicker(null); }
        else if (active && picker === "replace") setReplacement(exercise);
        else if (active) {
          if (exercise.id === active.exerciseId) { setError("Selecione uma alternativa diferente do exercício principal."); return; }
          update(target!, { ...active, alternativeExerciseId: exercise.id, alternativeExercise: exercise }); closeOperation();
        }
      }} />
    </Card> : null}
    {replacement && active && <Confirm title="Trocar exercício?" description={"Substituir " + active.exercise?.name + " por " + replacement.name + "? A prescrição será mantida. Revise sua compatibilidade antes de salvar."} onClose={() => setReplacement(null)} onConfirm={async () => { update(target!, { ...active, exerciseId: replacement.id, exercise: replacement, alternativeExerciseId: null, alternativeExercise: null }); closeOperation(); }} />}
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
