import { Image, Text, View } from "react-native";
import { Label, s } from "./ui";
import { useTheme } from "@/hooks/use-theme";

export function Brand({ compact = false, iconOnly = false, studio = false }: { compact?: boolean; iconOnly?: boolean; studio?: boolean }) {
  const t = useTheme();
  const size = compact ? 36 : 48;
  return <View style={[s.row, { flexWrap: "nowrap", gap: 10 }]}>
    <View style={{ width: size, height: size, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" }}>
      <Image source={require("../../../logotapago.png")} accessibilityLabel="Logo Tá Pago" style={{ width: size, height: size }} resizeMode="contain" />
    </View>
    {!iconOnly && <View>
      <Label size={compact ? 18 : 21} bold>TÁ PAGO{!studio && <Label size={10}> PERSONAL</Label>}</Label>
      {studio ? <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 1.3, color: t.accent }}>PERSONAL</Text> : !compact && <Label size={11} muted>Presença. Evolução. Resultado.</Label>}
    </View>}
  </View>;
}
