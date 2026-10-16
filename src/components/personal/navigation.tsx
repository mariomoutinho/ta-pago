import { router, usePathname } from "expo-router";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/personal/auth";
export default function PersonalNavigation() {
  const t = useTheme();
  const path = usePathname();
  const { user } = useSession();
  const items =
    user?.role === "personal"
      ? [
          ["/", "Visão geral"],
          ["/alunos", "Alunos"],
          ["/programas", "Programas"],
          ["/modelos", "Avaliações"],
        ]
      : [["/", "Meu acompanhamento"]];
  return (
    <View style={styles.nav}>
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
    </View>
  );
}
const styles = StyleSheet.create({
  nav: { flexDirection: "row", flexWrap: "wrap", gap: 8, maxWidth: "100%", flexShrink: 1 },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
  },
});
