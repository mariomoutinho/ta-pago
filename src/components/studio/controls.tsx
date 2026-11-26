import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View, type ViewStyle } from "react-native";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Label } from "../personal/ui";

export const studioWebProps = Platform.OS === "web" ? { className: "studio-interactive" } : {};
export function IconButton({ label, children, onPress, expanded }: { label: string; children: ReactNode; onPress: () => void; expanded?: boolean }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false), [hovered, setHovered] = useState(false);
  return <Pressable {...studioWebProps} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded }}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: focused ? t.accent : t.border, alignItems: "center", justifyContent: "center", backgroundColor: pressed || hovered ? t.backgroundSelected : t.background, opacity: pressed ? 0.8 : 1 })}>
    {children}
  </Pressable>;
}

export function StudioAction({ children, onPress, primary = false, label, disabled = false, style }: { children: ReactNode; onPress: () => void; primary?: boolean; label?: string; disabled?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false), [hovered, setHovered] = useState(false);
  return <Pressable {...studioWebProps} accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: focused || primary ? t.accent : t.border, backgroundColor: primary ? t.accent : hovered || pressed ? t.backgroundSelected : t.backgroundElement, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {typeof children === "string" ? <Text style={{ fontFamily: Fonts.sans, fontSize: 13, fontWeight: "600", color: primary ? "#FFFFFF" : t.text }}>{children}</Text> : children}
    </View>
  </Pressable>;
}
