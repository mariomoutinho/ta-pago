import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Empty, Field, Label, Notice } from "@/components/personal/ui";
import { PageHeader } from "@/components/studio/page-header";
import { SearchInput } from "@/components/studio/search-input";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import { prescriptionSchema, prescriptionPresetSchema, type PrescriptionPreset } from "../../../shared/workouts";
import { SeriesEditor } from "./series-editor";
import { defaultPrescriptionPresets } from "../../../shared/default-presets";

function PresetForm({ preset, done, cancel }: { preset?: PrescriptionPreset; done: () => void; cancel: () => void }) {
  const [name, setName] = useState(preset?.name ?? "");
  const item = prescriptionSchema.parse({ exerciseId: "preset-editor", ...(preset?.configuration ?? {}), series: preset?.series ?? [] });
  return <Card><Label bold>{preset?.id ? "Editar preset" : "Criar preset"}</Label>
    <Field label="Nome do preset" value={name} onChangeText={setName} maxLength={160} />
    <SeriesEditor item={item} presetTools={false} saveLabel="Salvar preset" save={async series => {
      const parsed = prescriptionPresetSchema.safeParse({ name, series, configuration: preset?.configuration ?? null });
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => issue.message).join(" · "));
      await api(preset?.id ? `/prescription-presets/${preset.id}` : "/prescription-presets", preset?.id ? "PUT" : "POST", parsed.data);
      done();
    }} />
    <Button variant="secondary" onPress={cancel}>Cancelar</Button>
  </Card>;
}

export function PresetLibrary() {
  const { data, loading, error, reload } = useResource<PrescriptionPreset[]>("/prescription-presets");
  const [editing, setEditing] = useState<PrescriptionPreset | "new" | null>(null);
  const [remove, setRemove] = useState<PrescriptionPreset | null>(null);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const visible = (data ?? []).filter(item => item.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const defaults = defaultPrescriptionPresets().filter(item => item.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <View style={{ gap: 24 }}>
    <PageHeader title="Presets" description="Crie configurações de séries para reutilizar nas prescrições."
      note="Alterar ou excluir um preset preserva as prescrições já salvas."
      action={!editing && <Button onPress={() => setEditing("new")}>+ Criar preset</Button>} />
    <Notice>{success}</Notice><Notice error>{error}</Notice>
    {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
    {editing ? <PresetForm key={editing === "new" ? "new" : editing.id} preset={editing === "new" ? undefined : editing} cancel={() => setEditing(null)} done={() => { setEditing(null); setSuccess("Preset salvo."); void reload(); }} /> : <>
      <SearchInput label="Buscar presets" value={search} onChange={setSearch} />
      <Label size={19} bold>Seus presets</Label>
      {loading && <Label>Carregando presets…</Label>}
      {!loading && !error && !visible.length && <Empty title="Nenhum preset encontrado" description="Crie um preset ou ajuste a busca." />}
      {visible.map(item => <Card key={item.id}><Label bold>{item.name}</Label><Label muted>{item.series.length} linha(s) de séries</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button variant="secondary" label={`Editar preset ${item.name}`} onPress={() => setEditing(item)}>Editar</Button>
          <Button variant="danger" label={`Excluir preset ${item.name}`} onPress={() => setRemove(item)}>Excluir</Button>
        </View>
      </Card>)}
      <Label size={19} bold>Presets padrão</Label>
      {defaults.map(item => <Card key={item.id}><Label bold>{item.name}</Label>
        <Label muted>{item.configuration?.notes || `${item.series.length} linha(s) de séries`}</Label>
        <Button variant="secondary" label={`Personalizar preset ${item.name}`} onPress={() => setEditing({ ...item, id: "" })}>Personalizar cópia</Button>
      </Card>)}
    </>}
    {remove && <Confirm title="Excluir preset?" description="As prescrições existentes serão preservadas." onClose={() => setRemove(null)} onConfirm={async () => {
      await api(`/prescription-presets/${remove.id}`, "DELETE"); setSuccess("Preset excluído."); setRemove(null); await reload();
    }} />}
  </View>;
}
