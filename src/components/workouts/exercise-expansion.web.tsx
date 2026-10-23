import type { ReactNode } from "react";
export function ExerciseExpansion({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className="workout-exercise-expansion" aria-hidden={!open} inert={!open} style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", visibility: open ? "visible" : "hidden" }}>
    <div style={{ minHeight: 0, overflow: "hidden" }}><div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: open ? 10 : 0 }}>{children}</div></div>
  </div>;
}
