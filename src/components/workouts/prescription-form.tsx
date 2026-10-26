import { useState } from "react";
import { View } from "react-native";
import { Button, Dialog, Field, Label } from "@/components/personal/ui";
import { prescriptionSchema, type Prescription } from "../../../shared/workouts";
import { SeriesEditor } from "./series-editor";
import { PresetPicker } from "./preset-picker";
export function PrescriptionForm({ item, done, cancel, choosePreset = false }: { item: Prescription; done: (item: Prescription) => void | Promise<void>; cancel: () => void; choosePreset?: boolean }) {
  const [data, setData] = useState(item);
  const [picking, setPicking] = useState(choosePreset);
  const [creating, setCreating] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [version, setVersion] = useState(0);
  return <View style={{ gap: 10 }}>
    <Label bold>{item.exercise?.name}</Label>
    {picking ? <Dialog title="Escolha um preset" onClose={cancel}><PresetPicker showHeading={false} skip={() => setPicking(false)} create={() => { setCreating(true); setPicking(false); }} select={preset => {
      setData({ ...data, ...(preset.configuration ?? {}), series: preset.series.map(row => ({ ...row })) }); setVersion(version + 1); setPicking(false);
    }} /></Dialog> : <>
      <SeriesEditor key={version} item={data} initialSavingPreset={creating} saveLabel="Confirmar prescrição" save={async series => {
        const parsed = prescriptionSchema.parse({ ...data, series });
        await done({ ...parsed, exercise: item.exercise, alternativeExercise: item.alternativeExercise });
      }} />
      <Button variant="secondary" onPress={() => setAdvanced(!advanced)}>{advanced ? "Recolher opções adicionais" : "Opções adicionais"}</Button>
      {advanced && <View style={{ gap: 6 }}>
        <Field label="Observações da prescrição" multiline value={data.notes} onChangeText={notes => setData({ ...data, notes })} />
        <Field label="Cadência geral" value={data.cadence} onChangeText={cadence => setData({ ...data, cadence })} />
        {(["rir", "rpe"] as const).map(key => <Field key={key} label={key.toUpperCase()} keyboardType="decimal-pad" value={data[key] == null ? "" : String(data[key])} onChangeText={value => setData({ ...data, [key]: value.trim() ? Number(value.replace(",", ".")) : null })} />)}
      </View>}
    </>}
    <Button variant="secondary" onPress={cancel}>Cancelar</Button>
  </View>;
}
