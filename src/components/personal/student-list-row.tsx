import { Pressable, View, Text, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import type { Student } from "@/features/personal/types";
import { Label } from "./ui";
const statusLabels = { ativo: "Ativo", pausado: "Pausado", inativo: "Inativo" };
export function StudentListRow({ student }: { student: Student }) {
  const t = useTheme();
  const initials = student.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir acompanhamento de ${student.name}`}
      onPress={() => router.push(`/alunos/${student.id}` as Href)}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: t.border,
          backgroundColor: pressed ? t.backgroundElement : t.background,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: t.backgroundElement }]}>
        <Text
          style={{ color: t.textSecondary, fontWeight: "700", fontSize: 14 }}
        >
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Label bold>{student.name}</Label>
        <Label muted size={11}>
          {statusLabels[student.status]} ·{" "}
          {student.accountId ? "Conta vinculada" : "Sem conta vinculada"}
        </Label>
      </View>
      <Text style={{ color: t.accent, fontSize: 24 }}>›</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 76,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
