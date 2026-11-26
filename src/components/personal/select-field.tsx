import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Dialog, Label, s } from "./ui";

export function SelectField({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  return <View style={{ gap: 7, marginBottom: 14 }}>
    <Label size={12} muted>{label}</Label>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(true)}
      style={[s.input, { borderColor: theme.border, backgroundColor: theme.background, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }]}>
      {options.find((option) => option.value === value)?.icon}
      <View style={{ flex: 1 }}><Label>{options.find((option) => option.value === value)?.label ?? label}</Label></View>
      <Label>▾</Label>
    </Pressable>
    {open && <Dialog title={label} onClose={() => setOpen(false)}>
      {options.map((option) => <Pressable key={option.value} accessibilityRole="radio"
        accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }}
        onPress={() => { onChange(option.value); setOpen(false); }}
        style={{ padding: 14, borderRadius: 8, marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: value === option.value ? theme.accentSoft : theme.background }}>
        {option.icon}
        <Label>{option.label}</Label>
      </Pressable>)}
    </Dialog>}
  </View>;
}
