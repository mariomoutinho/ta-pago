import { Page } from "@/components/personal/shell";
import { WorkoutPlans } from "@/components/workouts/plans";
import { Button, Heading } from "@/components/personal/ui";
import { router } from "expo-router";
export default function MyWorkoutsPage() {
  return (
    <Page>
      <Heading eyebrow="ÁREA DO ALUNO / TÁ PAGO" title="Meus treinos" subtitle="Rotinas liberadas pelo seu professor." />
      <Button variant="secondary" onPress={() => router.push("/")}>Voltar ao meu início</Button>
      <WorkoutPlans studentView />
    </Page>
  );
}
