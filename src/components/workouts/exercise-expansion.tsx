import type { ReactNode } from "react";
import { View } from "react-native";
export function ExerciseExpansion({ open, children, unmountOnClose = false }: { open: boolean; children: ReactNode; unmountOnClose?: boolean }) {
  if (unmountOnClose && !open) return null;
  return <View style={{ display: open ? "flex" : "none", gap: 10, paddingTop: 10 }}>{children}</View>;
}
