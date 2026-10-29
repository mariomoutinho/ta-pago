import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Fonts, Spacing } from "@/constants/theme";
export function Label({
  children,
  muted = false,
  size = 14,
  bold = false,
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  bold?: boolean;
}) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: muted ? t.textSecondary : t.text,
        fontFamily: Fonts.sans,
        fontSize: size,
        lineHeight: size * 1.5,
        fontWeight: bold ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Heading({
  title,
  subtitle,
  action,
  eyebrow = "ÁREA PERSONAL / TÁ PAGO",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <View style={s.heading}>
      <View style={{ flex: 1, minWidth: 200 }}>
        <Label size={11} muted>
          {eyebrow}
        </Label>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: useTheme().text }]}
        >
          {title}
        </Text>
        {subtitle && <Label muted>{subtitle}</Label>}
      </View>
      {action}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: t.background, borderColor: t.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  label?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label ?? (typeof children === "string" ? children : undefined)
      }
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === "primary"
              ? t.accent
              : variant === "danger"
                ? t.accentSoft
                : t.backgroundElement,
          borderColor: variant === "primary" ? t.accent : t.border,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontWeight: "600",
          fontSize: 13,
          color:
            variant === "primary"
              ? "#fff"
              : variant === "danger"
                ? t.danger
                : t.text,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 7, marginBottom: 14, flexGrow: 1 }}>
      <Label size={12} muted>
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.textSecondary}
        {...props}
        style={[
          s.input,
          {
            color: t.text,
            backgroundColor: t.background,
            borderColor: t.border,
          },
          props.multiline && { minHeight: 88, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Label size={12} muted>
        {label}
      </Label>
      <View style={s.row}>
        {options.map((o) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${o.label}`}
            accessibilityState={{ checked: value === o.value }}
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              s.choice,
              {
                backgroundColor:
                  value === o.value ? t.accentSoft : t.background,
                borderColor: value === o.value ? t.accent : t.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                color: value === o.value ? t.accent : t.text,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  const t = useTheme();
  return children ? (
    <View
      accessibilityRole={error ? "alert" : "text"}
      style={{
        padding: 14,
        borderRadius: 10,
        backgroundColor: error ? t.accentSoft : t.backgroundElement,
        marginVertical: 10,
      }}
    >
      <Text
        style={{
          color: error ? t.danger : t.textSecondary,
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {children}
      </Text>
    </View>
  ) : null;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 35, gap: 12 }}>
      <Label size={18} bold>
        {title}
      </Label>
      <Label muted>{description}</Label>
      {action}
    </View>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const t = useTheme();
  const { height } = useWindowDimensions();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          accessibilityViewIsModal
          style={[
            s.dialog,
            { backgroundColor: t.background, maxHeight: height * 0.92 },
          ]}
        >
          <View
            style={[
              s.row,
              {
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderColor: t.border,
              },
            ]}
          >
            <Label size={20} bold>
              {title}
            </Label>
            <Button variant="secondary" onPress={onClose}>
              Fechar
            </Button>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title={title} onClose={onClose}>
      <Label>{description}</Label>
      <Notice error>{error}</Notice>
      <View style={s.row}>
        <Button variant="secondary" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={busy}
          variant="danger"
          onPress={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Não foi possível concluir",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirmar
        </Button>
      </View>
    </Dialog>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.backgroundElement,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Label size={11}>{children}</Label>
    </View>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 14, marginVertical: 14 }}>
      <Label size={18} bold>
        {title}
      </Label>
      {children}
    </View>
  );
}
export const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    marginVertical: 8,
  },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, marginBottom: 18 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 46,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 42,
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 880,
    borderRadius: 20,
    overflow: "hidden",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  column: { flex: 1, minWidth: 240 },
});
