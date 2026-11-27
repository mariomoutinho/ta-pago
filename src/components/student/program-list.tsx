import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { useTheme } from "@/hooks/use-theme";
import { StudioAction, studioWebProps } from "@/components/studio/controls";
import { formatDate } from "@/features/personal/api";
import { dateSchema } from "../../../shared/validation";
import type { Plan } from "../../../shared/workouts";
import { studentListStyles as styles } from "./list-styles";

export function WorkoutProgramList({ plans, loading, error, retry, open }: {
  plans: Plan[]; loading: boolean; error: string; retry: () => void; open: (id: string) => void;
}) {
  const t = useTheme();
  if (loading) return <WorkoutProgramListSkeleton />;
  if (error) return <View style={styles.state}>
    <Text accessibilityRole="alert" style={[styles.stateText, { color: t.textSecondary }]}>Não foi possível carregar os treinos.</Text>
    <StudioAction onPress={retry}>Tentar novamente</StudioAction>
  </View>;
  if (!plans.length) return <WorkoutEmptyState />;
  return <View accessibilityLabel="Programas prescritos" testID="student-program-list">
    {plans.map(plan => <WorkoutProgramListItem key={plan.id} plan={plan} open={() => open(plan.id)} />)}
  </View>;
}

export function WorkoutProgramListItem({ plan, open }: { plan: Plan; open: () => void }) {
  const t = useTheme();
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const start = dateSchema.safeParse(plan.startsAt).success ? formatDate(plan.startsAt) : "Início não informado";
  const end = dateSchema.safeParse(plan.endsAt).success ? formatDate(plan.endsAt) : "Sem término";
  const objective = plan.objective?.trim();
  const keyboard = Platform.OS === "web" ? { onKeyDown: (event: { key: string; repeat: boolean; preventDefault: () => void }) => {
    if (event.key === "Enter" && !event.repeat) { event.preventDefault(); open(); }
  } } : {};
  return <Pressable {...studioWebProps} {...keyboard} accessibilityRole="link" accessibilityLabel={`Abrir rotina ${plan.title}`} onPress={open}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, { borderColor: focused ? t.accent : t.border, backgroundColor: pressed || hovered ? t.backgroundElement : "transparent" }]}>
    <View style={[styles.icon, { backgroundColor: t.accentSoft }]}><Dumbbell size={22} strokeWidth={1.75} color={t.accent} /></View>
    <View style={styles.text}>
      <Text style={[styles.title, { color: t.text }]}>{plan.title}</Text>
      <Text numberOfLines={1} style={[styles.metadata, { color: t.textSecondary }]}>{start} — {end}</Text>
      {!!objective && <Text style={[styles.metadata, { color: t.textSecondary }]}>{objective}</Text>}
    </View>
    <View style={styles.chevron}><ChevronRight size={18} strokeWidth={1.75} color={t.textSecondary} /></View>
  </Pressable>;
}

export function WorkoutProgramListSkeleton() {
  const t = useTheme();
  return <View accessibilityRole="progressbar" accessibilityLabel="Carregando treinos" accessibilityLiveRegion="polite" testID="student-program-skeleton">
    {[0, 1, 2].map(index => <View key={index} style={[styles.row, { borderColor: t.border }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.icon, { backgroundColor: t.backgroundElement }]} />
      <View style={[styles.text, { gap: 8 }]}>
        <View style={[styles.skeletonLine, { width: "75%", height: 14, backgroundColor: t.backgroundSelected }]} />
        <View style={[styles.skeletonLine, { width: "85%", backgroundColor: t.backgroundElement }]} />
        <View style={[styles.skeletonLine, { width: "60%", backgroundColor: t.backgroundElement }]} />
      </View>
      <View style={styles.chevron} />
    </View>)}
  </View>;
}

export function WorkoutEmptyState() {
  const t = useTheme();
  return <View style={styles.state}><Dumbbell size={24} strokeWidth={1.75} color={t.textSecondary} /><Text style={[styles.stateText, { color: t.textSecondary }]}>Você ainda não possui treinos prescritos.</Text></View>;
}
