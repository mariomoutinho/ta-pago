import { useState } from "react";
import { View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import type { Program } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import { Badge, Button, Card, Confirm, Empty, Heading, Label, Notice } from "@/components/personal/ui";
import { ProgramForm } from "@/components/workouts/program-form";
import { WorkoutScreen } from "@/components/workouts/workout-screen";
import { PrescriptionView } from "@/components/workouts/exercise-view";
export default function Programs() {
  const { data, error, loading, reload } = useResource<Program[]>("/programs");
  const [edit, setEdit] = useState<Program | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [initialWorkout, setInitialWorkout] = useState<number | null>(null);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState<Program | null>(null);
  const [success, setSuccess] = useState("");
  const routine = data?.find(p => p.id === selected);
  return <Page>
    {edit ? <WorkoutScreen title={initialWorkout !== null ? "Adicionar treino" : edit === "new" ? "Criar rotina" : "Editar rotina"} backLabel="Voltar às rotinas" back={() => setDiscard(true)}>
      <ProgramForm program={edit === "new" ? undefined : edit} initialWorkout={initialWorkout} cancel={() => setDiscard(true)} onSaved={() => { setEdit(null); setInitialWorkout(null); setSuccess("Rotina salva com sucesso."); void reload(); }} />
    </WorkoutScreen> : routine ? <WorkoutScreen title={routine.name} backLabel="Todas as rotinas" back={() => { setSelected(null); setExpanded(null); }}>
      <Notice>{success}</Notice><Notice error>{error}</Notice>
      <Badge>{routine.cycleDays} dias · {routine.weeklyFrequency}× / semana</Badge>
      {!!routine.description && <Label>{routine.description}</Label>}
      {!!routine.sessions && <Notice>{routine.sessions}</Notice>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button onPress={() => { const workouts = routine.workouts ?? []; setInitialWorkout(workouts.length); setEdit({ ...routine, workouts: [...workouts, { name: `Treino ${String.fromCharCode(65 + workouts.length)}`, subtitle: "", instructions: "", exercises: [] }] }); }} disabled={(routine.workouts?.length ?? 0) >= 30}>+ Adicionar treino</Button>
        <Button variant="secondary" onPress={() => setEdit(routine)}>Editar rotina</Button>
      </View>
      {!routine.workouts?.length && <Notice>Esta rotina ainda não possui treinos.</Notice>}
      {routine.workouts?.map((workout, index) => <Card key={index}>
        <Label size={18} bold>{workout.name}</Label>
        {!!workout.subtitle && <Label muted>{workout.subtitle}</Label>}
        <Label muted>{workout.exercises.length} exercício(s)</Label>
        <Button variant="secondary" onPress={() => setExpanded(expanded === index ? null : index)}>{expanded === index ? "Recolher exercícios" : "Ver exercícios"}</Button>
        {expanded === index && <View style={{ gap: 10 }}>
          {!!workout.instructions && <Notice>{workout.instructions}</Notice>}
          {!workout.exercises.length && <Notice>Este treino ainda não possui exercícios.</Notice>}
          {workout.exercises.map((item, i) => <View key={i}><Label bold>{item.exercise?.name ?? "Exercício indisponível"}</Label><PrescriptionView item={item} /></View>)}
        </View>}
      </Card>)}
    </WorkoutScreen> : <>
      <Heading title="Rotinas de treinamento" subtitle="Organize seus treinos em rotinas e reutilize nos planos dos alunos." action={<Button onPress={() => { setInitialWorkout(null); setEdit("new"); }}>Criar rotina</Button>} />
      <Notice>{success}</Notice><Notice error>{error}</Notice>
      {loading && <Notice>Carregando rotinas…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      {!loading && !error && !data?.length && <Empty title="Crie sua primeira rotina" description="Adicione treinos, exercícios e prescrições à rotina." />}
      {data?.map(p => <Card key={p.id}>
        <Badge>{p.cycleDays} dias · {p.weeklyFrequency}× / semana</Badge>
        <Label size={21} bold>{p.name}</Label><Label muted>{p.description}</Label>
        <Label>{p.workouts?.length ?? 0} treino(s)</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button label={`Abrir rotina ${p.name}`} onPress={() => { setSelected(p.id); setSuccess(""); }}>Ver treinos</Button>
          <Button variant="secondary" onPress={() => setEdit(p)}>Editar rotina</Button>
          <Button variant="danger" onPress={() => setRemove(p)}>Excluir</Button>
        </View>
      </Card>)}
    </>}
    {discard && <Confirm title="Descartar alterações da rotina?" description="Os treinos e alterações ainda não salvos serão descartados." onClose={() => setDiscard(false)} onConfirm={async () => { setEdit(null); setInitialWorkout(null); }} />}
    {remove && <Confirm title="Excluir rotina?" description="Rotinas associadas a alunos não podem ser excluídas. O histórico das avaliações é preservado." onClose={() => setRemove(null)} onConfirm={async () => { await api(`/programs/${remove.id}`, "DELETE"); await reload(); }} />}
  </Page>;
}
