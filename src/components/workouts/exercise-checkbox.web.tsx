import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
export function ExerciseCheckbox({ label, checked, mixed = false, disabled, toggle }: { label: string; checked: boolean; mixed?: boolean; disabled?: boolean; toggle: () => void }) {
  const t = useTheme(), input = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = mixed; }, [mixed]);
  return <label style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, cursor: disabled ? "default" : "pointer" }}>
    <input ref={input} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={toggle} style={{ width: 18, height: 18, margin: 0, accentColor: t.accent, cursor: "inherit" }} />
  </label>;
}
