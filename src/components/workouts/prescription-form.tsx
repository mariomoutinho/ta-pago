import { useState } from "react";
import { View } from "react-native";
import { Field, Label, Notice, s } from "@/components/personal/ui";
import {
  prescriptionSchema,
  type Prescription,
} from "../../../shared/workouts";
import { SaveForm } from "./form";
const numbers = [
  ["sets", "Séries"],
  ["load", "Carga (kg)"],
  ["durationSeconds", "Duração (segundos)"],
  ["restSeconds", "Descanso (segundos)"],
  ["rir", "RIR"],
  ["rpe", "RPE"],
] as const;
export function PrescriptionForm({
  item,
  done,
  cancel,
}: {
  item: Prescription;
  done: (item: Prescription) => void;
  cancel: () => void;
}) {
  const [data, setData] = useState(item);
  const [numeric, setNumeric] = useState<Record<string, string>>(
    Object.fromEntries(
      numbers.map(([key]) => [
        key,
        item[key] === null ? "" : String(item[key]),
      ]),
    ),
  );
  return (
    <SaveForm
      label="Confirmar prescrição"
      cancel={cancel}
      save={async () => {
        const values = Object.fromEntries(
          numbers.map(([key]) => [
            key,
            numeric[key].trim() === ""
              ? null
              : Number(numeric[key].replace(",", ".")),
          ]),
        );
        const parsed = prescriptionSchema.safeParse({ ...data, ...values });
        if (!parsed.success)
          throw new Error(
            parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(" · "),
          );
        done({ ...parsed.data, exercise: item.exercise });
      }}
    >
      <Label bold>{item.exercise?.name}</Label>
      <Label muted>
        Preencha somente o necessário. Use observações para intensidade e
        orientações.
      </Label>
      <View style={s.row}>
        {numbers.filter(([key]) => !item.series?.length || !["sets", "load", "restSeconds"].includes(key)).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={numeric[key]}
            keyboardType="decimal-pad"
            onChangeText={(v) => setNumeric({ ...numeric, [key]: v })}
          />
        ))}
      </View>
      {!!item.series?.length && <Notice>Este exercício usa linhas de séries. Para alterar séries, repetições, carga e intervalo, abra o exercício na janela do treino.</Notice>}
      {!item.series?.length && <Field
        label="Repetições (ex.: 10 ou 8-12)"
        value={data.repetitions}
        onChangeText={(v) => setData({ ...data, repetitions: v })}
      />}
      <Field
        label="Cadência"
        value={data.cadence}
        onChangeText={(v) => setData({ ...data, cadence: v })}
      />
      <Field
        label="Observações da prescrição"
        multiline
        value={data.notes}
        onChangeText={(v) => setData({ ...data, notes: v })}
      />
    </SaveForm>
  );
}
