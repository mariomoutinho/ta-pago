import { useRef, useState } from "react";
import { View } from "react-native";
import { Button, Card, Label, Notice } from "@/components/personal/ui";
import { message } from "@/features/personal/api";
import type { Prescription, WorkoutData, SeriesRow } from "../../../shared/workouts";
import { exerciseKey } from "../../../shared/workout-groups";
import { WorkoutScreen } from "./workout-screen";
import { SeriesEditor } from "./series-editor";
import { ExerciseDetails, PrescriptionView } from "./exercise-view";
import { PrescriptionForm } from "./prescription-form";
import { WorkoutExerciseList, type WorkoutChange } from "./workout-exercise-list";

export function WorkoutWindow({ workout, close, edit, add, saveSeries, saveExercises, addToGroup }: {
  addToGroup?: (groupId: string) => void;
  saveSeries?: (index: number, rows: SeriesRow[]) => Promise<void>;
  saveExercises?: (items: Prescription[], operation: WorkoutChange) => Promise<void>;
  workout: WorkoutData; close: () => void; edit?: () => void; add?: () => void;
}) {
  const [optimistic, setOptimistic] = useState<WorkoutData | null>(null);
  const current = optimistic ?? workout;
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dirty = useRef(new Set<string>());
  const [hasDirty, setHasDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function change(items: Prescription[], operation: WorkoutChange) {
    if (lock.current) throw new Error("Aguarde o salvamento atual.");
    lock.current = true; setBusy(true); setError(""); setSuccess("");
    setOptimistic({ ...current, exercises: items });
    try {
      await saveExercises?.(items, operation);
      setSuccess(operation === "order" ? "Ordem salva." : operation === "combine" ? "Exercícios combinados." : operation === "separate" ? "Exercícios separados." : operation === "delete" ? "Exercícios removidos deste treino." : "Treino atualizado.");
    } catch (e) { setOptimistic(null); setError(message(e)); throw e; }
    finally { setOptimistic(null); lock.current = false; setBusy(false); }
  }
  return <WorkoutScreen title={editing ? "Editar prescrição" : current.name} backLabel={editing ? "Voltar ao treino" : "Voltar aos treinos"} back={() => { if (!busy) { if (editing) setEditing(null); else close(); } }}>
    <View style={{ gap: 12 }}>
      {!!current.subtitle && <Label bold>{current.subtitle}</Label>}
      {!!current.instructions && <Notice>{current.instructions}</Notice>}
      <Notice error>{error}</Notice><Notice>{success}</Notice>
      {!current.exercises.length && <Notice>Este treino ainda não possui exercícios. Adicione exercícios pela biblioteca.</Notice>}
      <View style={editing ? { display: "none" } : undefined}><WorkoutExerciseList items={current.exercises} disabled={busy || hasDirty || !!editing} change={saveExercises ? change : undefined} editItem={saveExercises ? setEditing : undefined} addToGroup={addToGroup} normalActions={(edit || add) && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {edit && <Button disabled={busy || hasDirty || !!editing} variant="secondary" onPress={edit}>Editar e reordenar</Button>}
        {add && <Button disabled={busy || hasDirty || !!editing} onPress={add}>Adicionar exercício</Button>}
      </View>} details={(item, index) => saveSeries ? <>
        {item.exercise && <ExerciseDetails exercise={item.exercise} compact />}
        {!!item.notes && <Notice>{item.notes}</Notice>}
        {item.alternativeExercise && <Notice>{"Alternativa: " + item.alternativeExercise.name}</Notice>}
        <SeriesEditor item={item} disabled={busy || !!editing} onDirty={value => { const key = exerciseKey(item); if (value) dirty.current.add(key); else dirty.current.delete(key); setHasDirty(dirty.current.size > 0); }} save={rows => saveSeries(index, rows)} />
      </> : <PrescriptionView item={item} />} /></View>
      {editing && <Card><PrescriptionForm item={current.exercises.find(item => exerciseKey(item) === editing)!} cancel={() => setEditing(null)} done={async item => { await change(current.exercises.map(previous => exerciseKey(previous) === editing ? item : previous), "edit"); setEditing(null); }} /></Card>}
    </View>
  </WorkoutScreen>;
}
