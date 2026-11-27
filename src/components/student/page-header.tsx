import { Text, View } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import { IconButton } from "@/components/studio/controls";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function StudentPageHeader({ title, back, backLabel }: { title: string; back: () => void; backLabel: string }) {
  const t = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
    <IconButton label={backLabel} onPress={back}><ArrowLeft size={22} strokeWidth={1.75} color={t.text} /></IconButton>
    <Text accessibilityRole="header" style={{ flex: 1, color: t.text, fontFamily: Fonts.sans, fontSize: 24, lineHeight: 32, fontWeight: "700" }}>{title}</Text>
  </View>;
}
