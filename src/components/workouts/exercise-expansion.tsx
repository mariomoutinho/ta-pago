import type { ReactNode } from "react";
import { View } from "react-native";
export function ExerciseExpansion({ open, children }: { open: boolean; children: ReactNode }) {
  return <View style={{ display: open ? "flex" : "none", gap: 10, paddingTop: 10 }}>{children}</View>;
}
