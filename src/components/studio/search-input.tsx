import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { StudioIcon } from "./icons";

export function SearchInput({ label, value, onChange }: { label: string; value: string; onChange: (text: string) => void }) {
  const t = useTheme(), [focused, setFocused] = useState(false);
  return <View style={{ height: 50, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: focused ? t.accent : t.border, backgroundColor: t.sidebar ?? t.background, paddingHorizontal: 16 }}>
    <StudioIcon name="search" />
    <TextInput accessibilityLabel={label} placeholder={label} value={value} onChangeText={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholderTextColor={t.textSecondary}
      style={{ flex: 1, minWidth: 0, fontFamily: Fonts.sans, fontSize: 14, color: t.text, paddingVertical: 12, outlineWidth: 0 }} />
  </View>;
}
