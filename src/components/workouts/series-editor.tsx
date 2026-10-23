import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { api, message } from "@/features/personal/api";
import { useResource } from "@/features/personal/use-resource";
import { Button, Dialog, Field, Label, Notice } from "@/components/personal/ui";
import { seriesSchema, type Prescription, type PrescriptionPreset, type SeriesRow } from "../../../shared/workouts";

type Row = { combined: string; load: string; rest: string };
const display = (rows: SeriesRow[]): Row[] => rows.map(r => ({ combined: `${r.sets}/${r.repetitions}`, load: r.load === null ? "" : String(r.load), rest: r.restSeconds === null ? "" : String(r.restSeconds) }));
function parse(rows: Row[]) {
  return seriesSchema.parse(rows.map(r => {
    const parts = r.combined.split("/");
    return { sets: parts.length === 2 ? Number(parts[0]) : NaN, repetitions: parts[1] ?? "",
      load: r.load.trim() ? Number(r.load.replace(",", ".")) : null,
      restSeconds: r.rest.trim() ? Number(r.rest.replace(",", ".")) : null };
  }));
}
export function SeriesEditor({ item, save, onDirty, draft = false, disabled = false }: { item: Prescription; save: (series: SeriesRow[]) => Promise<void>; onDirty?: (dirty: boolean) => void; draft?: boolean; disabled?: boolean }) {
  const t = useTheme();
  const [rows, setRows] = useState<Row[]>(() => item.series?.length ? display(item.series) : [{
    combined: `${item.sets ?? ""}/${item.repetitions || ""}`, load: item.load === null ? "" : String(item.load), rest: item.restSeconds === null ? "" : String(item.restSeconds),
  }]);
  const [saving, setBusy] = useState(false);
  const busy = disabled || saving;
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preset, setPreset] = useState<"save" | "load" | null>(null);
  const [name, setName] = useState("");
  const presets = useResource<PrescriptionPreset[]>(preset === "load" ? "/prescription-presets" : null);
  const change = (next: Row[]) => { onDirty?.(true); setRows(next); setSuccess(""); setError(""); };
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setSuccess("");
    try { await action(); }
    catch (e) { setError(e instanceof Error && e.name === "ZodError" ? "Confira as linhas: use série/repetições (ex.: 3/15), carga não negativa e intervalo em segundos inteiros." : message(e)); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", gap: 6, paddingRight: 44 }}>
      {["Série/rep", "Carga (kg)", "Intervalo (s)"].map(label => <View key={label} style={{ flex: 1 }}><Label size={11} bold>{label}</Label></View>)}
    </View>
    {rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {(["combined", "load", "rest"] as const).map((key, column) => <TextInput key={key}
        accessibilityLabel={`${["Série/repetições", "Carga", "Intervalo"][column]} ${index + 1}`}
        value={row[key]} editable={!busy} keyboardType={key === "combined" ? "default" : "decimal-pad"}
        onChangeText={value => change(rows.map((r, i) => i === index ? { ...r, [key]: value } : r))}
        style={{ flex: 1, minWidth: 0, minHeight: 44, padding: 6, borderWidth: 1, borderRadius: 4, borderColor: t.border, color: t.text, backgroundColor: t.backgroundElement }} />)}
      <Button label={`Excluir série ${index + 1}`} variant="secondary" disabled={busy || rows.length === 1} onPress={() => change(rows.filter((_, i) => i !== index))}>×</Button>
    </View>)}
    <Label size={11} muted>Série/rep: 3/15 = 3 séries de 15 repetições. Também aceita 3/8-12.</Label>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      <Button disabled={busy || rows.length >= 50} onPress={() => change([...rows, { combined: "1/", load: "", rest: "" }])}>Adicionar série</Button>
      <Button disabled={busy || rows.length >= 50} variant="secondary" onPress={() => change([...rows, { ...rows[rows.length - 1] }])}>Replicar séries</Button>
      <Button disabled={busy} variant="secondary" onPress={() => setPreset("load")}>Adicionar preset</Button>
      <Button disabled={busy} variant="secondary" onPress={() => setPreset("save")}>Salvar como preset</Button>
    </View>
    <Label size={11} muted>Replicar séries duplica a última linha. Adicionar preset acrescenta suas linhas.</Label>
    <Notice error>{error}</Notice><Notice>{success}</Notice>
    <Button disabled={busy} onPress={() => void run(async () => { await save(parse(rows)); onDirty?.(false); setSuccess(draft ? "Séries confirmadas. Salve o formulário para gravar." : "Prescrição salva."); })}>{busy ? "Salvando…" : draft ? "Confirmar séries" : "Salvar prescrição"}</Button>
    {preset && <Dialog title={preset === "save" ? "Salvar preset" : "Presets de séries"} onClose={() => { if (!busy) setPreset(null); }}>
      <View style={{ gap: 12 }}>
        <Notice error>{error || presets.error}</Notice>
        {preset === "save" ? <>
          <Field label="Nome do preset" value={name} onChangeText={setName} maxLength={160} />
          <Button disabled={busy || !name.trim()} onPress={() => void run(async () => {
            await api("/prescription-presets", "POST", { name: name.trim(), series: parse(rows) });
            setPreset(null); setName(""); setSuccess("Preset salvo. A prescrição do aluno só muda ao salvar a prescrição.");
          })}>Salvar preset</Button>
        </> : <>
          {presets.loading && <Notice>Carregando presets…</Notice>}
          {!presets.loading && !presets.error && !presets.data?.length && <Notice>Nenhum preset cadastrado.</Notice>}
          {presets.error && <Button onPress={() => void presets.reload()}>Tentar novamente</Button>}
          {presets.data?.map(p => <Button key={p.id} variant="secondary" onPress={() => {
            if (rows.length + p.series.length > 50) { setError("Limite de 50 linhas por exercício."); return; }
            change([...rows, ...display(p.series)]); setPreset(null);
          }}>{p.name}</Button>)}
        </>}
      </View>
    </Dialog>}
  </View>;
}
