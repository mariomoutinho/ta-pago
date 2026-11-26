import type { ReactNode } from "react";
import { Platform, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { Label } from "../personal/ui";
import { StudioIcon } from "./icons";

export function WorkoutTemplateCard({ name, subtitle, count, actions, children }: { name: string; subtitle: string; count: number; actions: ReactNode; children?: ReactNode }) {
  const t = useTheme(), { width } = useWindowDimensions(), mobile = width < 760;
  return <View {...(Platform.OS === "web" ? { dataSet: { studioCard: "true" } } : {})} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.background, padding: mobile ? 16 : 24, gap: 16, boxShadow: "0 4px 20px #00000006" }}>
    <View style={{ flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", justifyContent: "space-between", gap: 20, minHeight: mobile ? undefined : 72 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 20 }}>
        <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><StudioIcon name="dumbbell" accent /></View>
        <View style={{ gap: 4, flex: 1, minWidth: 0 }}><Text style={{ fontFamily: Fonts.sans, fontSize: mobile ? 19 : 22, fontWeight: "700", color: t.text, letterSpacing: -0.4 }}>{name}</Text>
          {!!subtitle && <Label size={13} muted>{subtitle}</Label>}<Label size={12} muted>{count} {count === 1 ? "exercício" : "exercícios"}</Label></View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>{actions}</View>
    </View>
    {children}
  </View>;
}

export function WorkoutSkeleton() {
  const t = useTheme();
  return <View accessibilityRole="progressbar" accessibilityLabel="Carregando treinos preparados" style={{ gap: 16 }}>
    {[0, 1, 2].map(index => <View key={index} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 24, backgroundColor: t.background, flexDirection: "row", alignItems: "center", gap: 20 }}>
      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.backgroundElement }} />
      <View style={{ gap: 10, flex: 1 }}><View style={{ height: 16, width: "40%", borderRadius: 4, backgroundColor: t.backgroundElement }} /><View style={{ height: 12, width: "25%", borderRadius: 4, backgroundColor: t.backgroundElement }} /></View>
    </View>)}
  </View>;
}
