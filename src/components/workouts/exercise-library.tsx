import { useState } from "react";
import { View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api } from "@/features/personal/api";
import {
  Badge,
  Button,
  Card,
  Choices,
  Confirm,
  Empty,
  Field,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import {
  exerciseSchema,
  type Exercise,
  type ExerciseData,
} from "../../../shared/workouts";
import { SaveForm, TextFields } from "./form";
import { ExerciseDetails } from "./exercise-view";
const empty: ExerciseData = {
  name: "",
  muscleGroup: "",
  category: "",
  equipment: "",
  description: "",
  imageUrl: "",
  videoUrl: "",
  notes: "",
  status: "ativo",
};
function ExerciseForm({
  exercise,
  done,
  cancel,
}: {
  exercise?: Exercise;
  done: (exercise: Exercise) => void;
  cancel: () => void;
}) {
  const [data, setData] = useState<ExerciseData>(exercise ?? empty);
  return (
    <Card>
      <Label size={20} bold>
        {exercise ? "Editar exercício" : "Cadastrar exercício"}
      </Label>
      <SaveForm
        label="Salvar exercício"
        cancel={cancel}
        save={async () => {
          const parsed = exerciseSchema.safeParse(data);
          if (!parsed.success)
            throw new Error(
              parsed.error.issues.map((i) => i.message).join(" · "),
            );
          done(
            await api<Exercise>(
              exercise ? `/exercises/${exercise.id}` : "/exercises",
              exercise ? "PUT" : "POST",
              parsed.data,
            ),
          );
        }}
      >
        <TextFields
          value={data}
          change={setData}
          fields={[
            ["name", "Nome do exercício *"],
            ["muscleGroup", "Grupo muscular *"],
            ["category", "Categoria *"],
            ["equipment", "Equipamento"],
            ["description", "Descrição / instruções"],
            ["imageUrl", "Imagem (URL http/https)"],
            ["videoUrl", "Vídeo (URL http/https)"],
            ["notes", "Observações do exercício"],
          ]}
        />
      </SaveForm>
    </Card>
  );
}
export function ExerciseLibrary({
  select,
}: {
  select?: (exercise: Exercise) => void;
}) {
  const { data, loading, error, reload } =
    useResource<Exercise[]>("/exercises");
  const [edit, setEdit] = useState<Exercise | "new" | null>(null);
  const [archive, setArchive] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("ativo");
  const [success, setSuccess] = useState("");
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = data?.filter(
    (e) =>
      e.status === status &&
      normalize(e.name).includes(normalize(search)) &&
      normalize(e.muscleGroup).includes(normalize(muscle)) &&
      normalize(e.category).includes(normalize(category)),
  );
  return (
    <View style={{ gap: 12 }}>
      <Label size={20} bold>
        Biblioteca de exercícios
      </Label>
      <Badge>Meus exercícios · biblioteca privada</Badge>
      <Notice>{success}</Notice>
      <Notice error>{error}</Notice>
      {loading && <Notice>Carregando exercícios…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      {edit ? (
        <ExerciseForm
          exercise={edit === "new" ? undefined : edit}
          cancel={() => setEdit(null)}
          done={(e) => {
            setEdit(null);
            setSuccess("Exercício salvo.");
            void reload();
            if (select) select(e);
          }}
        />
      ) : (
        <Button onPress={() => setEdit("new")}>+ Criar exercício</Button>
      )}
      <Field
        label="Buscar exercícios..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={s.row}>
        <Field
          label="Filtrar grupo muscular"
          value={muscle}
          onChangeText={setMuscle}
        />
        <Field
          label="Filtrar categoria"
          value={category}
          onChangeText={setCategory}
        />
      </View>
      {!select && (
        <Choices
          label="Exercícios"
          value={status}
          onChange={setStatus}
          options={[
            { value: "ativo", label: "Ativos" },
            { value: "arquivado", label: "Arquivados" },
          ]}
        />
      )}
      {!loading && !error && !visible?.length && (
        <Empty
          title={
            data?.length
              ? "Sem resultados na busca"
              : "Você ainda não cadastrou exercícios."
          }
          description="Cadastre um exercício ou ajuste os filtros."
        />
      )}
      {visible?.map((e) => (
        <Card key={e.id}>
          <ExerciseDetails exercise={e} collapsible />
          <View style={s.row}>
            {select && (
              <Button onPress={() => select(e)}>+ Adicionar ao treino</Button>
            )}
            <Button variant="secondary" onPress={() => setEdit(e)}>
              Editar exercício
            </Button>
            <Button variant="secondary" onPress={() => setArchive(e)}>
              {e.status === "ativo"
                ? "Arquivar exercício"
                : "Restaurar exercício"}
            </Button>
          </View>
        </Card>
      ))}
      {archive && (
        <Confirm
          title={
            archive.status === "ativo"
              ? "Arquivar exercício?"
              : "Restaurar exercício?"
          }
          description="As prescrições existentes serão preservadas."
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            await api(`/exercises/${archive.id}`, "PUT", {
              ...archive,
              status: archive.status === "ativo" ? "arquivado" : "ativo",
            });
            setSuccess("Exercício atualizado.");
            await reload();
          }}
        />
      )}
    </View>
  );
}
