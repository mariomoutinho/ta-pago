import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Label, Notice } from "@/components/personal/ui";
import type { Program } from "@/features/personal/types";
import { api } from "@/features/personal/api";
import { programRoutineSchema } from "../../../shared/programs";
import type { WorkoutData } from "../../../shared/workouts";
import { SaveForm, TextFields } from "./form";
import { identifyWorkout, move, WorkoutEditor } from "./workout-editor";
import { PreparedWorkouts } from "./prepared-workouts";
export function ProgramForm({ program, onSaved, cancel = () => {}, initialWorkout = null }: { program?: Program; onSaved: () => void; cancel?: () => void; initialWorkout?: number | null }) {
  const [data, setData] = useState({ name: program?.name ?? "", description: program?.description ?? "", weeklyFrequency: program?.weeklyFrequency ?? 3, cycleDays: program?.cycleDays ?? 30, sessions: program?.sessions ?? "" });
  const [workouts, setWorkouts] = useState<WorkoutData[]>(() => (program?.workouts ?? []).map(identifyWorkout));
  const [open, setOpen] = useState<number | null>(initialWorkout);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  return <SaveForm label={initialWorkout !== null ? "Salvar treino" : "Salvar rotina"} cancel={cancel} hideActions={focused || picking} save={async () => {
    if (pending) throw new Error("Confirme ou cancele a prescrição aberta antes de salvar.");
    const parsed = programRoutineSchema.parse({ ...data, workouts, revision: program?.revision });
    await api(program ? `/programs/${program.id}` : "/programs", program ? "PUT" : "POST", parsed);
    onSaved();
  }}>
    {open === null && !picking && <View style={{ gap: 10 }}>
      <TextFields value={data} change={setData} fields={[["name", "Nome da rotina *"], ["description", "Descrição"], ["weeklyFrequency", "Treinos por semana *"], ["cycleDays", "Duração do ciclo (dias) *"]]} />
      {!!data.sessions && <Notice>{"Organização registrada anteriormente: " + data.sessions}</Notice>}
      <Label size={18} bold>Treinos da rotina</Label>
      {!workouts.length && <Notice>Adicione os treinos que compõem esta rotina.</Notice>}
      {workouts.map((workout, index) => <Card key={index}>
        <Label bold>{workout.name}</Label><Label muted>{workout.exercises.length} exercício(s)</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Button variant="secondary" onPress={() => setOpen(index)}>Editar treino</Button>
          <Button variant="secondary" disabled={index === 0} onPress={() => setWorkouts(move(workouts, index, -1))}>↑</Button>
          <Button variant="secondary" disabled={index === workouts.length - 1} onPress={() => setWorkouts(move(workouts, index, 1))}>↓</Button>
          <Button variant="danger" onPress={() => setWorkouts(workouts.filter((_, i) => i !== index))}>Remover do rascunho</Button>
        </View>
      </Card>)}
      <Button disabled={workouts.length >= 30} onPress={() => { setWorkouts([...workouts, { name: `Treino ${String.fromCharCode(65 + workouts.length)}`, subtitle: "", instructions: "", exercises: [] }]); setOpen(workouts.length); }}>+ Adicionar treino</Button>
      <Button disabled={workouts.length >= 30} variant="secondary" onPress={() => setPicking(true)}>Usar treino preparado</Button>
    </View>}
    {picking && <View style={{ gap: 10 }}><Button variant="secondary" onPress={() => setPicking(false)}>Voltar à rotina</Button><PreparedWorkouts select={workout => { setWorkouts([...workouts, identifyWorkout(workout)]); setOpen(workouts.length); setPicking(false); }} /></View>}
    {open !== null && workouts[open] && <View style={{ gap: 10 }}>
      {!focused && initialWorkout === null && <Button disabled={pending} variant="secondary" onPress={() => setOpen(null)}>Voltar à rotina</Button>}
      <WorkoutEditor workout={workouts[open]} change={workout => setWorkouts(current => current.map((w, i) => i === open ? workout : w))} pending={setPending} screenChanged={setFocused} />
    </View>}
  </SaveForm>;
}
