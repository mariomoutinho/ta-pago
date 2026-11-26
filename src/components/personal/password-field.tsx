import { useState } from "react";
import { Pressable, type TextInputProps } from "react-native";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import { useTheme } from "@/hooks/use-theme";
import { Field } from "./ui";

export function PasswordField({ label = "Senha", ...props }: Omit<TextInputProps, "secureTextEntry"> & { label?: string }) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return <Field {...props} label={label} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false}
    trailingAction={<Pressable accessibilityRole="button" accessibilityLabel={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
      aria-pressed={visible} disabled={props.editable === false} onPress={() => setVisible(current => !current)}
      style={({ pressed }) => ({ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: pressed ? t.accentSoft : "transparent" })}>
      <Icon size={20} strokeWidth={1.75} color={t.textSecondary} />
    </Pressable>} />;
}
