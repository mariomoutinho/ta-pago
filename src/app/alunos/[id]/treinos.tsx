import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Page } from "@/components/personal/shell";
import { Button, Heading, Label, Notice } from "@/components/personal/ui";
import { WorkoutPlans } from "@/components/workouts/plans";
import { useResource } from "@/features/personal/use-resource";
import type { Student } from "@/features/personal/types";

export default function StudentWorkouts() {
  const { id, rotina, treino } = useLocalSearchParams<{ id: string; rotina?: string; treino?: string }>();
  const { data: student, error } = useResource<Student>(`/students/${id}`);
  const navigate = (planId?: string, workoutId?: string) => {
    if (planId === rotina && workoutId === treino) return;
    router.push({
    pathname: `/alunos/${id}/treinos`,
    params: { ...(planId ? { rotina: planId } : {}), ...(workoutId ? { treino: workoutId } : {}) },
    } as Href);
  };
  return <Page resetKey={`${rotina ?? ""}/${treino ?? ""}`}>
    <View style={{ gap: 18, width: "100%", maxWidth: 960, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button variant="secondary" onPress={() => router.push(`/alunos/${id}` as Href)}>Perfil do aluno</Button>
        <Button variant="secondary" onPress={() => navigate()}>Treinos</Button>
      </View>
      {treino && student ? <Label muted>{student.name}</Label> : <Heading title={student ? `Treinos de ${student.name}` : "Treinos do aluno"} />}
      <Notice error>{error}</Notice>
      {student && <WorkoutPlans studentId={id} route={{ planId: rotina, workoutId: treino,
        selectPlan: planId => navigate(planId), selectWorkout: workoutId => navigate(rotina, workoutId) }} />}
    </View>
  </Page>;
}
