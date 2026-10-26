import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { api, message } from "@/features/personal/api";
import { Button, Choices, Dialog, Field, Label, Notice } from "@/components/personal/ui";
import { seriesSchema, type Prescription, type SeriesRow } from "../../../shared/workouts";
import { initialSeries, seriesFields, seriesTypes, seriesValue, type SeriesType } from "../../../shared/series";
import { PresetPicker } from "./preset-picker";
type Row = { type: SeriesType; values: Record<string, string> };
const display = (rows: SeriesRow[]): Row[] => rows.map(r => ({ type: r.type ?? "repetitions-load", values: Object.fromEntries(seriesFields(r.type ?? "repetitions-load").map(f => [f.key, seriesValue(r, f.key)])) }));
function parse(rows: Row[]) {
  return seriesSchema.parse(rows.map(row => {
    const parts = (row.values.combined ?? "1/").split("/");
    const values = Object.fromEntries(seriesFields(row.type).filter(f => f.key !== "combined").map(f => [f.key, f.numeric ? row.values[f.key]?.trim() ? Number(row.values[f.key].replace(",", ".")) : null : row.values[f.key] ?? ""]));
    return { type: row.type, sets: Number(parts[0]), repetitions: parts[1] ?? "", load: null, restSeconds: null, ...values };
  }));
}
export function SeriesEditor({ item, save, onDirty, draft = false, disabled = false, saveLabel, initialSavingPreset = false }: { item: Prescription; save: (series: SeriesRow[]) => Promise<void>; onDirty?: (dirty: boolean) => void; draft?: boolean; disabled?: boolean; saveLabel?: string; initialSavingPreset?: boolean }) {
  const t = useTheme();
  const [rows, setRows] = useState<Row[]>(() => display(initialSeries(item)));
  const [saving, setBusy] = useState(false);
  const busy = disabled || saving;
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preset, setPreset] = useState<"save" | "load" | null>(initialSavingPreset ? "save" : null);
  const [name, setName] = useState("");
  const [typePicker, setTypePicker] = useState<number | "add" | null>(null);
  const [chosenType, setChosenType] = useState<SeriesType>(rows[0].type);
  const change = (next: Row[]) => { onDirty?.(true); setRows(next); setSuccess(""); setError(""); };
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setSuccess("");
    try { await action(); }
    catch (e) { setError(e instanceof Error && e.name === "ZodError" ? "Confira os campos: série/rep (ex.: 3/15), valores não negativos e tempo/intervalo em segundos inteiros." : message(e)); }
    finally { setBusy(false); }
  }
  const chooseType = (type: SeriesType) => {
    const source = typePicker === "add" ? undefined : rows[typePicker ?? 0];
    const values = Object.fromEntries(seriesFields(type).map(f => [f.key, source?.values[f.key] ?? (f.key === "combined" ? "1/1" : "")]));
    const next = { type, values };
    change(typePicker === "add" ? [...rows, next] : rows.map((row, i) => i === typePicker ? next : row)); setTypePicker(null);
  };
  return <View style={{ gap: 10 }}>
    <View style={preset === "load" ? { display: "none" } : { gap: 8 }}>
      {rows.map((row, index) => <View key={index} style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Label size={11} muted>{seriesTypes.find(type => type.value === row.type)?.label}</Label>
          <Button label={`Alterar tipo da série ${index + 1}`} variant="secondary" disabled={busy} onPress={() => { setChosenType(row.type); setTypePicker(index); }}>Tipo</Button>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>
          {seriesFields(row.type).map(field => <View key={field.key} style={{ flex: 1, minWidth: field.key === "notes" ? 170 : 74, gap: 4 }}>
            <Label size={11} bold>{field.label}</Label>
            <TextInput accessibilityLabel={`${field.key === "combined" ? "Série/repetições" : field.label.replace(/ \(.*\)/, "")} ${index + 1}`} value={row.values[field.key] ?? ""} editable={!busy} keyboardType={field.numeric ? "decimal-pad" : "default"} multiline={field.key === "notes"}
              onChangeText={value => change(rows.map((r, i) => i === index ? { ...r, values: { ...r.values, [field.key]: value } } : r))}
              style={{ minHeight: 40, padding: 6, borderWidth: 1, borderRadius: 4, borderColor: t.border, color: t.text, backgroundColor: t.backgroundElement }} />
          </View>)}
          <Button label={`Excluir série ${index + 1}`} variant="secondary" disabled={busy || rows.length === 1} onPress={() => change(rows.filter((_, i) => i !== index))}>×</Button>
        </View>
      </View>)}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Button disabled={busy || rows.length >= 50} onPress={() => { setChosenType(rows[rows.length - 1].type); setTypePicker("add"); }}>Adicionar série</Button>
        <Button disabled={busy || rows.length >= 50} variant="secondary" onPress={() => { const last = rows[rows.length - 1]; change([...rows, { ...last, values: { ...last.values } }]); }}>Replicar séries</Button>
        <Button disabled={busy} variant="secondary" onPress={() => setPreset("load")}>Adicionar preset</Button>
        <Button disabled={busy} variant="secondary" onPress={() => setPreset(preset === "save" ? null : "save")}>Salvar como preset</Button>
      </View>
      {preset === "save" && <View style={{ gap: 6 }}>
        <Field label="Nome do preset" value={name} onChangeText={setName} maxLength={160} />
        <Button disabled={busy || !name.trim()} onPress={() => void run(async () => { await api("/prescription-presets", "POST", { name: name.trim(), series: parse(rows) }); setPreset(null); setName(""); setSuccess("Preset salvo."); })}>Salvar preset</Button>
      </View>}
      <Notice error>{error}</Notice><Notice>{success}</Notice>
      <Button disabled={busy} onPress={() => void run(async () => { await save(parse(rows)); onDirty?.(false); setSuccess(draft ? "Séries confirmadas. Salve o formulário para gravar." : "Prescrição salva."); })}>{busy ? "Salvando…" : saveLabel ?? (draft ? "Confirmar séries" : "Salvar prescrição")}</Button>
    </View>
    {preset === "load" && <Dialog title="Escolha um preset" onClose={() => setPreset(null)}><View style={{ gap: 10 }}>
      <Notice error>{error}</Notice>
      <PresetPicker showHeading={false} create={() => setPreset("save")} select={p => {
        const additions = p.series.length ? p.series : initialSeries({ ...item, ...(p.configuration ?? {}), series: [] });
        if (rows.length + additions.length > 50) { setError("Limite de 50 linhas por exercício."); return; }
        change([...rows, ...display(additions)]); setPreset(null);
      }} />
    </View></Dialog>}
    {typePicker !== null && <Dialog title="Selecione o tipo da série" onClose={() => setTypePicker(null)}>
      <Choices label="Tipo da série" value={chosenType} options={seriesTypes} onChange={value => setChosenType(value as SeriesType)} />
      <Button onPress={() => chooseType(chosenType)}>Confirmar tipo</Button>
    </Dialog>}
  </View>;
}
