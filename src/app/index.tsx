import { useSession } from "@/features/personal/auth";
import { PersonalDashboard } from "@/components/personal/dashboard";
import { StudentHome } from "@/components/student/home";
export default function Home() {
  const { user } = useSession();
  return user?.role === "student" ? <StudentHome /> : <PersonalDashboard />;
}
