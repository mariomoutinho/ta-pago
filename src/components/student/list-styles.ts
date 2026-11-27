import { StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

// Estrutura compartilhável de listas compactas da área Focus.
export const studentListStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 96, paddingVertical: 16, borderBottomWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: "600" },
  metadata: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  chevron: { width: 18, alignItems: "center", flexShrink: 0 },
  state: { alignItems: "center", paddingVertical: 64, gap: 16 },
  stateText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 260 },
  skeletonLine: { height: 10, borderRadius: 4 },
});
