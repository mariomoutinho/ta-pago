import { router, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/personal/auth";
export default function PersonalNavigation() {
  const t = useTheme();
  const path = usePathname();
  const { user } = useSession();
  const items =
    user?.role === "personal"
      ? [
          ["/", "Início"],
          ["/alunos", "Alunos"],
          ["/programas", "Programas"],
          ["/exercicios", "Exercícios"],
          ["/modelos", "Avaliações"],
        ]
      : [
          ["/", "Meu acompanhamento"],
          ["/treinos", "Treinos"],
        ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxWidth: "100%", flexGrow: 0 }}
      contentContainerStyle={styles.nav}
    >
      {items.map(([href, label]) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Pressable
            key={href}
            onPress={() => router.push(href as "/")}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              { backgroundColor: active ? t.accentSoft : t.backgroundElement },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? t.accent : t.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
  },
});
