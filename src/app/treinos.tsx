import { Page } from "@/components/personal/shell";
import { WorkoutPlans } from "@/components/workouts/plans";
import { StudentPageHeader } from "@/components/student/page-header";
import { Focus } from "@/constants/focus";
import { router, useLocalSearchParams } from "expo-router";
export default function MyWorkoutsPage() {
  const params = useLocalSearchParams<{ rotina?: string; treino?: string }>();
  const planId = typeof params.rotina === "string" ? params.rotina : undefined;
  const workoutId = typeof params.treino === "string" ? params.treino : undefined;
  const navigate = (plan?: string, workout?: string) => {
    if (plan === planId && workout === workoutId) return;
    router.push({ pathname: "/treinos", params: { ...(plan ? { rotina: plan } : {}), ...(workout ? { treino: workout } : {}) } });
  };
  return (
    <Page resetKey={`${planId ?? ""}/${workoutId ?? ""}`} contentStyle={{ paddingHorizontal: Focus.padding, paddingTop: 8, paddingBottom: 32 }}>
      <StudentPageHeader title="Meus treinos" backLabel="Voltar ao meu início" back={() => router.replace("/")} />
      <WorkoutPlans studentView route={{ planId, workoutId, selectPlan: plan => navigate(plan), selectWorkout: workout => navigate(planId, workout) }} />
    </Page>
  );
}
