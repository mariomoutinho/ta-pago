import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Field, Label, Notice } from "@/components/personal/ui";
import { useResource } from "@/features/personal/use-resource";
import type { PrescriptionPreset } from "../../../shared/workouts";
import { seriesFields, seriesValue } from "../../../shared/series";
import { defaultPrescriptionPresets } from "../../../shared/default-presets";
export function PresetPicker({ select, create, skip, showHeading = true }: { select: (preset: PrescriptionPreset) => void; create: () => void; skip?: () => void; showHeading?: boolean }) {
  const presets = useResource<PrescriptionPreset[]>("/prescription-presets");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const matches = (p: PrescriptionPreset) => p.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
  const sections = [
    { title: "Presets padrão", items: defaultPrescriptionPresets().filter(matches) },
    { title: "Seus presets", items: (presets.data ?? []).filter(matches) },
  ];
  return <View style={{ gap: 10 }}>
    {showHeading && <Label size={20} bold>Escolha um preset</Label>}
    <Field label="Pesquise por nome" value={query} onChangeText={setQuery} />
    {skip && <Button onPress={skip}>Adicionar sem preset</Button>}
    <Button variant="secondary" onPress={create}>Criar novo preset</Button>
    <Notice error>{presets.error}</Notice>
    {presets.loading && <Notice>Carregando presets…</Notice>}
    {presets.error && <Button onPress={() => void presets.reload()}>Tentar novamente</Button>}
    {!presets.loading && !presets.error && sections.every(section => !section.items.length) && <Notice>Nenhum preset encontrado.</Notice>}
    {sections.map(section => <View key={section.title} style={{ gap: 8 }}>
    <Label bold>{section.title}</Label>
    {section.title === "Seus presets" && !query && !presets.loading && !presets.error && !section.items.length && <Label muted>Os presets que você criar aparecerão aqui.</Label>}
    {section.items.map(p => <Card key={p.id}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}><Label bold>{p.name}</Label><Button variant="secondary" onPress={() => setPreview(preview === p.id ? null : p.id)}>{preview === p.id ? "Recolher preset" : "Ver preset"}</Button></View>
        <Button label={`Usar preset ${p.name}`} onPress={() => select(p)}>+</Button>
      </View>
      {preview === p.id && <View style={{ gap: 6 }}>
        {p.series.map((row, i) => <Label key={i}>{seriesFields(row.type ?? "repetitions-load").map(f => `${f.label}: ${seriesValue(row, f.key) || "—"}`).join(" · ")}</Label>)}
        {!p.series.length && <Label>Preset com configuração de prescrição salva.</Label>}
        {!!p.configuration?.notes && <Label>{p.configuration.notes}</Label>}
      </View>}
    </Card>)}
    </View>)}
  </View>;
}
