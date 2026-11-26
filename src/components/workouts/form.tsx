import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { Button, Notice, s } from "@/components/personal/ui";
import { FormattedField } from "@/components/personal/formatted-field";
import { message } from "@/features/personal/api";

export function SaveForm({
  children,
  save,
  cancel,
  label = "Salvar",
  hideActions = false,
}: {
  children: ReactNode;
  save: () => Promise<void>;
  cancel: () => void;
  label?: string;
  hideActions?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 12 }}>
      {children}
      <Notice error>{error}</Notice>
      <View style={[s.row, hideActions && { display: "none" }]}>
        <Button
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            setError("");
            try {
              await save();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Salvando…" : label}
        </Button>
        <Button disabled={busy} variant="secondary" onPress={cancel}>
          Cancelar
        </Button>
      </View>
    </View>
  );
}
export function TextFields<T extends object>({
  value,
  fields,
  change,
}: {
  value: T;
  fields: readonly (readonly [keyof T, string, "date"?])[];
  change: (next: T) => void;
}) {
  return (
    <>
      {fields.map(([key, label, format]) => (
        <FormattedField
          key={String(key)}
          label={label}
          format={format}
          value={String(value[key] ?? "")}
          multiline={/Orientações|Observações|Descrição/.test(label)}
          onChangeText={(text) => change({ ...value, [key]: text })}
        />
      ))}
    </>
  );
}
