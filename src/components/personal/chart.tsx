import { View, ScrollView } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { formatDate } from "@/features/personal/api";
import { Card, Label, Notice, s } from "./ui";
export function Chart({
  title,
  points,
}: {
  title: string;
  points: { date: string; value: number | null }[];
}) {
  const t = useTheme();
  const valid = points.filter(
    (x): x is { date: string; value: number } =>
      x.value !== null && Number.isFinite(x.value),
  );
  const max = Math.max(1, ...valid.map((x) => x.value));
  return (
    <Card style={s.column}>
      <Label size={16} bold>
        {title}
      </Label>
      {valid.length < 2 ? (
        <Notice>
          Registre pelo menos dois períodos com medidas para comparar a
          evolução.
        </Notice>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 18, paddingTop: 24, paddingBottom: 10 }}
        >
          <View
            accessibilityLabel={`Gráfico de ${title}`}
            style={{ flexDirection: "row", alignItems: "flex-end", gap: 18 }}
          >
            {valid.map((p, i) => (
              <View key={i} style={{ width: 66, alignItems: "center", gap: 8 }}>
                <Label size={12} bold>
                  {p.value}
                </Label>
                <View
                  style={{
                    height: 130,
                    justifyContent: "flex-end",
                    width: 28,
                    backgroundColor: t.backgroundElement,
                    borderRadius: 6,
                  }}
                >
                  <View
                    style={{
                      height: Math.max(2, (p.value / max) * 130),
                      width: 28,
                      backgroundColor: t.accent,
                      borderRadius: 6,
                    }}
                  />
                </View>
                <Label size={10} muted>
                  {formatDate(p.date)}
                </Label>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Card>
  );
}
