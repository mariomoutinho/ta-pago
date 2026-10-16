import { Pressable, View } from "react-native";
import { Label, s } from "./ui";
import { useTheme } from "@/hooks/use-theme";
import type { EnrollmentDraft } from "../../../shared/enrollment";
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onChange}
      style={[
        s.row,
        {
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: checked ? theme.accent : theme.border,
          borderRadius: 10,
        },
      ]}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: checked ? theme.accent : theme.border,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && (
          <View
            style={{
              width: 7,
              height: 12,
              borderRightWidth: 2,
              borderBottomWidth: 2,
              borderColor: theme.accent,
              transform: [{ rotate: "45deg" }],
              marginTop: -3,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Label>{label}</Label>
      </View>
    </Pressable>
  );
}
export function EnrollmentSummaryView({ form }: { form: EnrollmentDraft }) {
  return (
    <View style={{ gap: 10 }}>
      {[
        ["Nome", form.name],
        ["E-mail", form.email],
        ["WhatsApp", form.phone],
        ["Nascimento", form.birthDate || "Não informado"],
        [
          "Cidade / estado",
          [form.city, form.state].filter(Boolean).join(" / ") ||
            "Não informado",
        ],
        ["Gênero", form.gender],
        ["Objetivos", form.goals.join(", ")],
        ["Objetivos específicos", form.specificGoals],
        ["Pratica atividade física", form.practicing],
        ["Dias por semana", String(form.daysPerWeek)],
        ["Tempo de prática", form.experienceDuration],
        ["Personal anterior", form.previousTrainer],
        ["Modalidade", form.preferredActivity],
        ["Disponibilidade", form.availability],
        ["Recomendações para exercício", form.health.restrictions],
        ["Lesões ou limitações", form.health.injuries],
        ["Adaptações", form.health.adaptations],
      ].map(([label, value]) => (
        <View key={label}>
          <Label size={12} muted>
            {label}
          </Label>
          <Label>{value || "Não informado"}</Label>
        </View>
      ))}
    </View>
  );
}

export function ChainIcon() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Link de compartilhamento"
      style={{ width: 48, height: 48, marginBottom: 12 }}
    >
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: 4 + i * 13,
            top: 10 + i * 12,
            width: 29,
            height: 16,
            borderWidth: 3,
            borderColor: theme.accent,
            borderRadius: 9,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      ))}
    </View>
  );
}
