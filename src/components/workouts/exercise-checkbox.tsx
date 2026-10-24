import { Pressable, View } from "react-native";
import { Label } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
export function ExerciseCheckbox({ label, checked, mixed = false, disabled, toggle }: { label: string; checked: boolean; mixed?: boolean; disabled?: boolean; toggle: () => void }) {
  const t = useTheme();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: mixed ? "mixed" : checked, disabled }} disabled={disabled} onPress={toggle} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? .5 : 1 }}>
    <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: checked ? t.accent : t.textSecondary, backgroundColor: checked ? t.accentSoft : t.background, alignItems: "center", justifyContent: "center" }}><Label bold>{checked ? "✓" : mixed ? "−" : ""}</Label></View>
  </Pressable>;
}
