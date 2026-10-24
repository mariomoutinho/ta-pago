import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button, Label } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";

/** Etapa do fluxo no conteúdo da página, sem Modal ou backdrop. */
export function WorkoutScreen({ title, back, children, backLabel = "Voltar", hideHeader = false }: {
  title: string; back: () => void; children: ReactNode; backLabel?: string; hideHeader?: boolean;
}) {
  const theme = useTheme();
  return <View style={{ gap: 18, width: "100%" }}>
    {!hideHeader && <View style={{ gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ alignSelf: "flex-start" }}><Button variant="secondary" onPress={back}>{backLabel}</Button></View>
      <Label muted>Treinos</Label>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "700" }}>{title}</Text>
    </View>}
    {children}
  </View>;
}
