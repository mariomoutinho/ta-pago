import { useState } from "react";
import { View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import type { Template } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Heading,
  Label,
  Notice,
  Section,
  s,
} from "@/components/personal/ui";
import { TemplateForm } from "@/components/personal/template-form";
export default function Templates() {
  const { data, error, reload } = useResource<Template[]>("/templates");
  const [edit, setEdit] = useState<Template | "new" | null>(null);
  const [view, setView] = useState<Template | null>(null);
  return (
    <Page>
      <Heading
        title="Modelos de avaliação"
        subtitle="A escuta orienta o próximo passo. Preserve a história de cada ciclo."
        action={<Button onPress={() => setEdit("new")}>Novo modelo</Button>}
      />
      <Notice error>{error}</Notice>
      <View style={s.grid}>
        {data?.map((t) => (
          <Card key={t.id} style={s.column}>
            <Badge>
              Versão {t.version} · {t.cycleDays} dias
            </Badge>
            <View style={{ marginVertical: 16, gap: 12 }}>
              <Label size={20} bold>
                {t.name}
              </Label>
              <Label muted>
                {t.questions.length} perguntas ·{" "}
                {[...new Set(t.questions.map((q) => q.dimension))].length}{" "}
                dimensões
              </Label>
            </View>
            <View style={s.row}>
              <Button variant="secondary" onPress={() => setView(t)}>
                Consultar perguntas
              </Button>
              <Button onPress={() => setEdit(t)}>Nova versão</Button>
            </View>
          </Card>
        ))}
      </View>
      {view && (
        <Dialog title={view.name} onClose={() => setView(null)}>
          {view.questions.map((q) => (
            <Section key={q.id} title={`${q.position}. ${q.text}`}>
              <Label muted>
                {q.dimension} ·{" "}
                {q.options.length
                  ? q.options.map((o) => o.label).join(" | ")
                  : q.type === "text"
                    ? "Resposta livre"
                    : `${q.min ?? "sem mínimo"} a ${q.max ?? "sem máximo"}`}
              </Label>
            </Section>
          ))}
        </Dialog>
      )}
      {edit && (
        <Dialog title="Modelo de avaliação" onClose={() => setEdit(null)}>
          <TemplateForm
            template={edit === "new" ? undefined : edit}
            onSaved={() => {
              setEdit(null);
              void reload();
            }}
          />
        </Dialog>
      )}
    </Page>
  );
}
