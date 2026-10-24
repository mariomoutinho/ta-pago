import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Dialog, Label, Notice } from "@/components/personal/ui";
import { message } from "@/features/personal/api";
import type { Prescription, WorkoutData, SeriesRow } from "../../../shared/workouts";
import { exerciseKey } from "../../../shared/workout-groups";
import { SeriesEditor } from "./series-editor";
import { ExerciseDetails, PrescriptionView } from "./exercise-view";
import { WorkoutExerciseList, type WorkoutChange } from "./workout-exercise-list";

export function WorkoutWindow({ workout, close, edit, add, saveSeries, saveExercises }: {
  saveSeries?: (index: number, rows: SeriesRow[]) => Promise<void>;
  saveExercises?: (items: Prescription[], operation: WorkoutChange) => Promise<void>;
  workout: WorkoutData; close: () => void; edit?: () => void; add?: () => void;
}) {
  const [current, setCurrent] = useState(workout);
  useEffect(() => setCurrent(workout), [workout]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dirty = useRef(new Set<string>());
  const [hasDirty, setHasDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function change(items: Prescription[], operation: WorkoutChange) {
    if (lock.current) throw new Error("Aguarde o salvamento atual.");
    const previous = current;
    lock.current = true; setBusy(true); setError(""); setSuccess("");
    setCurrent({ ...current, exercises: items });
    try {
      await saveExercises?.(items, operation);
      setSuccess(operation === "order" ? "Ordem salva." : operation === "combine" ? "Exercícios combinados." : operation === "separate" ? "Exercícios separados." : "Exercícios removidos deste treino.");
    } catch (e) { setCurrent(previous); setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  return <Dialog title={current.name} onClose={() => { if (!busy) close(); }}>
    <View style={{ gap: 12 }}>
      {!!current.subtitle && <Label bold>{current.subtitle}</Label>}
      {!!current.instructions && <Notice>{current.instructions}</Notice>}
      {(edit || add) && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {edit && <Button disabled={busy || hasDirty} variant="secondary" onPress={edit}>Editar e reordenar</Button>}
        {add && <Button disabled={busy || hasDirty} onPress={add}>Adicionar exercício</Button>}
      </View>}
      <Notice error>{error}</Notice><Notice>{success}</Notice>
      {!current.exercises.length && <Notice>Este treino ainda não possui exercícios. Adicione exercícios pela biblioteca.</Notice>}
      <WorkoutExerciseList items={current.exercises} disabled={busy || hasDirty} change={saveExercises ? change : undefined} details={(item, index) => saveSeries ? <>
        {item.exercise && <ExerciseDetails exercise={item.exercise} />}
        {item.alternativeExercise && <Notice>{"Alternativa: " + item.alternativeExercise.name}</Notice>}
        <SeriesEditor item={item} disabled={busy} onDirty={value => { const key = exerciseKey(item); value ? dirty.current.add(key) : dirty.current.delete(key); setHasDirty(dirty.current.size > 0); }} save={rows => saveSeries(index, rows)} />
      </> : <PrescriptionView item={item} />} />
    </View>
  </Dialog>;
}
