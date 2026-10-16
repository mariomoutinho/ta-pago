import { useState } from "react";
import { View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import type { Program } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Dialog,
  Empty,
  Heading,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import { ProgramForm } from "@/components/personal/forms";
export default function Programs() {
  const { data, error, reload } = useResource<Program[]>("/programs");
  const [edit, setEdit] = useState<Program | "new" | null>(null);
  const [remove, setRemove] = useState<Program | null>(null);
  return (
    <Page>
      <Heading
        title="Programas de treinamento"
        subtitle="Ciclos e frequências que respeitam cada objetivo."
        action={<Button onPress={() => setEdit("new")}>Novo programa</Button>}
      />
      <Notice error>{error}</Notice>
      <View style={s.grid}>
        {data?.length ? (
          data.map((p) => (
            <Card key={p.id} style={s.column}>
              <Badge>
                {p.cycleDays} dias · {p.weeklyFrequency}× / semana
              </Badge>
              <View style={{ marginVertical: 16, gap: 10 }}>
                <Label size={21} bold>
                  {p.name}
                </Label>
                <Label muted>{p.description}</Label>
                <Label>{p.sessions}</Label>
              </View>
              <View style={s.row}>
                <Button variant="secondary" onPress={() => setEdit(p)}>
                  Editar programa
                </Button>
                <Button variant="danger" onPress={() => setRemove(p)}>
                  Excluir
                </Button>
              </View>
            </Card>
          ))
        ) : (
          <Card style={s.column}>
            <Empty
              title="Organize o primeiro programa"
              description="Defina livremente sessões, frequência e duração dos ciclos."
            />
          </Card>
        )}
      </View>
      {edit && (
        <Dialog
          title={edit === "new" ? "Novo programa" : "Editar programa"}
          onClose={() => setEdit(null)}
        >
          <ProgramForm
            program={edit === "new" ? undefined : edit}
            onSaved={() => {
              setEdit(null);
              void reload();
            }}
          />
        </Dialog>
      )}
      {remove && (
        <Confirm
          title="Excluir programa"
          description="As avaliações históricas mantêm uma cópia do programa utilizado. Programas associados a alunos não podem ser excluídos."
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await api(`/programs/${remove.id}`, "DELETE");
            await reload();
          }}
        />
      )}
    </Page>
  );
}
