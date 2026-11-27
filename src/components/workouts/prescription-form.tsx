import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Button, Dialog, Field, Label } from "@/components/personal/ui";
import { prescriptionSchema, type Prescription } from "../../../shared/workouts";
import { SeriesEditor } from "./series-editor";
import { PresetPicker } from "./preset-picker";
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import X from 'lucide-react-native/icons/x';
import { useTheme } from '@/hooks/use-theme';
import { PrescriptionAction } from './prescription-action';
export function PrescriptionForm({ item, done, cancel, choosePreset = false }: { item: Prescription; done: (item: Prescription) => void | Promise<void>; cancel: () => void; choosePreset?: boolean }) {
  const t = useTheme(), { width } = useWindowDimensions();
  const [data, setData] = useState(item);
  const [picking, setPicking] = useState(choosePreset);
  const [creating, setCreating] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [version, setVersion] = useState(0);
  return <View style={{ gap: 24, padding: width < 600 ? 18 : 32, borderWidth: 1, borderColor: t.border, borderRadius: 20, backgroundColor: t.background }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <Label size={width < 600 ? 20 : 24} bold>{item.exercise?.name}</Label>
      {item.exercise && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: t.accent, backgroundColor: t.accentSoft }}>
        <Dumbbell size={16} color={t.accent} strokeWidth={1.75} />
        <Label size={12}>{[item.exercise.category, item.exercise.muscleGroup].filter(Boolean).join(' · ')}</Label>
      </View>}
    </View>
    {picking ? <Dialog title="Escolha um preset" onClose={cancel}><PresetPicker showHeading={false} skip={() => setPicking(false)} create={() => { setCreating(true); setPicking(false); }} select={preset => {
      setData({ ...data, ...(preset.configuration ?? {}), series: preset.series.map(row => ({ ...row })) }); setVersion(version + 1); setPicking(false);
    }} /></Dialog> : <>
      <SeriesEditor presentation="prescription" key={version} item={data} initialSavingPreset={creating} saveLabel="Confirmar prescrição" save={async series => {
        const parsed = prescriptionSchema.parse({ ...data, series });
        await done({ ...parsed, exercise: item.exercise, alternativeExercise: item.alternativeExercise });
      }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <PrescriptionAction style={{ flex: 1, minWidth: 180 }} icon={SlidersHorizontal} title={advanced ? "Recolher opções adicionais" : "Opções adicionais"} onPress={() => setAdvanced(!advanced)} />
        <PrescriptionAction style={{ flex: 1, minWidth: 180 }} icon={X} title="Cancelar" onPress={cancel} />
      </View>
      {advanced && <View style={{ gap: 6 }}>
        <Field label="Observações da prescrição" multiline value={data.notes} onChangeText={notes => setData({ ...data, notes })} />
        <Field label="Cadência geral" value={data.cadence} onChangeText={cadence => setData({ ...data, cadence })} />
        {(["rir", "rpe"] as const).map(key => <Field key={key} label={key.toUpperCase()} keyboardType="decimal-pad" value={data[key] == null ? "" : String(data[key])} onChangeText={value => setData({ ...data, [key]: value.trim() ? Number(value.replace(",", ".")) : null })} />)}
      </View>}
    </>}
    {picking && <Button variant="secondary" onPress={cancel}>Cancelar</Button>}
  </View>;
}
