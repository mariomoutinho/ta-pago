import { Page } from "@/components/personal/shell";
import { WorkoutPlans } from "@/components/workouts/plans";
export default function MyWorkoutsPage() {
  return (
    <Page>
      <WorkoutPlans studentView />
    </Page>
  );
}
