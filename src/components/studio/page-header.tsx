import { Text, View, useWindowDimensions } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { Label } from "../personal/ui";

export function PageHeader({ title, description, note, action }: { title: string; description: string; note?: string; action?: ReactNode }) {
  const t = useTheme(), { width } = useWindowDimensions();
  return <View style={{ gap: 14 }}>
    <Text style={{ fontFamily: Fonts.sans, fontSize: 10, fontWeight: "600", letterSpacing: 1.3, color: t.accent }}>BIBLIOTECA / TREINOS</Text>
    <View style={{ flexDirection: width < 1200 ? "column" : "row", alignItems: width < 1200 ? "flex-start" : "center", justifyContent: "space-between", gap: 20 }}>
      <Text accessibilityRole="header" style={{ color: t.text, fontFamily: Fonts.sans, fontSize: width < 600 ? 28 : 34, letterSpacing: -1, fontWeight: "700", flexShrink: 1 }}>{title}</Text>
      {action}
    </View>
    <View style={{ gap: 4 }}><Label size={14} muted>{description}</Label>{note && <Label size={12} muted>{note}</Label>}</View>
  </View>;
}
