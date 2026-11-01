import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { exerciseVideoThumbnail } from "@/features/personal/exercise-video";
import { useTheme } from "@/hooks/use-theme";
import { useResource } from "@/features/personal/use-resource";
import { api, message } from "@/features/personal/api";
import { pickVideo, uploadVideo } from "@/features/personal/video-upload";
import type { DocumentPickerAsset } from "expo-document-picker";
import {
  Badge,
  Button,
  Card,
  Choices,
  Confirm,
  Dialog,
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
const muscleGroups = ["Peitoral", "Dorsal", "Bíceps", "Tríceps", "Inferiores", "Ombros", "Abdômen", "Antebraço"];
const categories = ["Musculação", "Aeróbico", "Funcional", "Alongamento", "Em casa", "Mobilidade", "Elástico", "MAT Pilates", "Laboral"];
function OptionField({ label, value, options, change }: {
  label: string; value: string; options: string[]; change: (value: string) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 6, marginBottom: 14 }}>
    <Field label={label} value={value} onChangeText={change} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Listar ${label.replace(" *", "")}`}
      aria-expanded={open} onPress={() => setOpen(current => !current)}
      style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: t.backgroundElement }}>
      <Label>{open ? "Fechar opções ▴" : "Selecionar da lista ▾"}</Label>
    </Pressable>
    {open && <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, overflow: "hidden" }}>
      {options.map(option => <Pressable key={option} accessibilityRole="button"
        accessibilityLabel={`${label.replace(" *", "")}: ${option}`}
        onPress={() => { change(option); setOpen(false); }}
        style={({ pressed }) => ({ padding: 12, minHeight: 44, backgroundColor: pressed || value === option ? t.accentSoft : t.backgroundElement })}>
        <Label>{option}</Label>
      </Pressable>)}
    </View>}
  </View>;
}
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
  exercises,
}: {
  exercises: Exercise[];
  exercise?: Exercise;
  done: (exercise: Exercise) => void;
  cancel: () => void;
}) {
  const [data, setData] = useState<ExerciseData>(exercise ?? empty);
  const [videoMode, setVideoMode] = useState(exercise?.videoUrl.includes("/api/exercise-videos/") ? "upload" : "url");
  const [videoFile, setVideoFile] = useState<DocumentPickerAsset | null>(null);
  const [videoError, setVideoError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const chooseVideo = async () => {
    setVideoError("");
    try {
      const selected = await pickVideo();
      if (selected.canceled) return;
      const file = selected.assets[0];
      if (!/\.mp4$/i.test(file.name) || (file.size ?? 0) > 25 * 1024 * 1024) throw new Error("Selecione um vídeo MP4 de até 25 MB.");
      setVideoFile(file);
    } catch (error) { setVideoError(message(error)); }
  };
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
          if (videoFile && videoMode === "upload") {
            setUploadProgress(0);
            try {
              const videoUrl = await uploadVideo(videoFile, setUploadProgress);
              parsed.data.videoUrl = videoUrl;
              setData(current => ({ ...current, videoUrl }));
              setVideoFile(null);
            } finally { setUploadProgress(null); }
          }
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
          ]}
        />
        <OptionField label="Grupo muscular *" value={data.muscleGroup}
          options={[...new Set([...muscleGroups, ...exercises.map(e => e.muscleGroup)])].filter(Boolean)}
          change={muscleGroup => setData(current => ({ ...current, muscleGroup }))} />
        <OptionField label="Categoria *" value={data.category}
          options={[...new Set([...categories, ...exercises.map(e => e.category)])].filter(Boolean)}
          change={category => setData(current => ({ ...current, category }))} />
        <TextFields value={data} change={setData} fields={[
            ["equipment", "Equipamento"],
            ["description", "Descrição / instruções"],
            ["imageUrl", "Imagem (URL http/https)"],
            ["notes", "Observações do exercício"],
          ]}
        />
        <Choices label="Vídeo do exercício" value={videoMode}
          onChange={mode => { if (mode === videoMode) return; setVideoMode(mode); setVideoFile(null); setVideoError(""); setData(current => ({ ...current, videoUrl: "" })); }}
          options={[{ value: "url", label: "YouTube / URL" }, { value: "upload", label: "Enviar vídeo" }]} />
        {videoMode === "url" ? <Field label="Vídeo (URL http/https)" placeholder="Cole o link do YouTube" value={data.videoUrl}
          onChangeText={videoUrl => setData(current => ({ ...current, videoUrl }))} /> : <View style={{ gap: 8 }}>
          <Label muted>Envie um MP4 de até 25 MB, preferencialmente H.264. Ele será reproduzido no Tá Pago, sem marcas do YouTube.</Label>
          <Button variant="secondary" disabled={uploadProgress !== null} onPress={() => void chooseVideo()}>{videoFile || data.videoUrl ? "Trocar vídeo" : "Selecionar vídeo do dispositivo"}</Button>
          <Label>{videoFile ? videoFile.name : data.videoUrl ? "Vídeo enviado e salvo." : "Nenhum vídeo selecionado."}</Label>
          {!!(videoFile || data.videoUrl) && <Button variant="secondary" disabled={uploadProgress !== null} onPress={() => { setVideoFile(null); setData(current => ({ ...current, videoUrl: "" })); }}>Remover vídeo</Button>}
          <Notice>{uploadProgress === null ? "O vídeo será enviado ao salvar o exercício." : `Enviando vídeo… ${uploadProgress}%`}</Notice>
        </View>}
        <Notice error>{videoError}</Notice>
      </SaveForm>
    </Card>
  );
}
function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const [failed, setFailed] = useState(false);
  const uri = exerciseVideoThumbnail(exercise.videoUrl) ?? exercise.imageUrl;
  return uri && !failed ? (
    <Image source={{ uri }} accessibilityLabel={`Miniatura: ${exercise.name}`}
      style={{ width: 64, height: 64 }} resizeMode="cover" onError={() => setFailed(true)} />
  ) : <Label size={24}>{exercise.videoUrl ? "▷" : "◇"}</Label>;
}

export function ExerciseLibrary({
  select,
}: {
  select?: (exercise: Exercise) => void;
}) {
  const t = useTheme();
  const [filterPanel, setFilterPanel] = useState<"muscle" | "category" | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const { data, loading, error, reload } =
    useResource<Exercise[]>("/exercises");
  const [edit, setEdit] = useState<Exercise | "new" | null>(null);
  const [archive, setArchive] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("ativo");
  const [success, setSuccess] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [savingFavorites, setSavingFavorites] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const isFavorite = (exercise: Exercise) => favorites[exercise.id] ?? exercise.favorite ?? false;
  const saveFavorite = async (exercise: Exercise) => {
    if (savingFavorites.includes(exercise.id)) return;
    setSavingFavorites(current => [...current, exercise.id]);
    setFavoriteError("");
    try {
      const saved = await api<Exercise>(`/exercises/${exercise.id}/favorite`, "PUT", { favorite: !isFavorite(exercise) });
      setFavorites(current => ({ ...current, [exercise.id]: !!saved.favorite }));
    } catch (error) { setFavoriteError(message(error)); }
    finally { setSavingFavorites(current => current.filter(id => id !== exercise.id)); }
  };
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = data?.filter(
    (e) =>
      e.status === status &&
      (!onlyFavorites || isFavorite(e)) &&
      normalize(e.name).includes(normalize(search)) &&
      normalize(e.muscleGroup).includes(normalize(muscle)) &&
      normalize(e.category).includes(normalize(category)),
  );
  return (
    <View style={{ gap: 12, width: "100%", maxWidth: 820, alignSelf: "center" }}>
      <Label size={20} bold>
        Biblioteca de exercícios
      </Label>
      <Badge>Meus exercícios · biblioteca privada</Badge>
      <Notice>{success}</Notice>
      <Notice error>{error}</Notice>
      <Notice error>{favoriteError}</Notice>
      {loading && <Notice>Carregando exercícios…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      <View style={{ backgroundColor: t.background, borderColor: t.border, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      {edit === "new" ? (
        <ExerciseForm
          exercises={data ?? []}
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
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setFilterPanel(filterPanel === "muscle" ? null : "muscle")}>Grupos musculares</Button></View>
        <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setFilterPanel(filterPanel === "category" ? null : "category")}>Categorias</Button></View>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 16 }}>
      <Field
        placeholder="Buscar exercícios..."
        label="Buscar exercícios..."
        value={search}
        onChangeText={setSearch}
      />
      </View>
      {filterPanel && <View style={{ backgroundColor: t.backgroundElement, padding: 12, borderRadius: 8 }}>
        <Field label={filterPanel === "muscle" ? "Filtrar grupo muscular" : "Filtrar categoria"}
          value={filterPanel === "muscle" ? muscle : category}
          onChangeText={filterPanel === "muscle" ? setMuscle : setCategory} />
        <View style={{ gap: 4 }}>
          {[...new Set([...(filterPanel === "muscle" ? muscleGroups : categories), ...(data ?? []).map(e => filterPanel === "muscle" ? e.muscleGroup : e.category)])].filter(Boolean).sort().map(value => (
            <Button key={value} variant="secondary" onPress={() => { if (filterPanel === "muscle") setMuscle(value); else setCategory(value); setFilterPanel(null); }}>{value}</Button>
          ))}
        </View>
      </View>}
      <Choices label="Mostrar exercícios" value={onlyFavorites ? "favorites" : "all"}
        onChange={value => setOnlyFavorites(value === "favorites")}
        options={[{ value: "all", label: "Todos" }, { value: "favorites", label: "★ Favoritos" }]} />
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
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Label muted size={12}>{visible?.length ?? 0} exercício(s){muscle ? ` · ${muscle}` : ""}{category ? ` · ${category}` : ""}</Label>
        {!!(search || muscle || category || status !== "ativo" || onlyFavorites) && <Button variant="secondary" onPress={() => { setSearch(""); setMuscle(""); setCategory(""); setStatus("ativo"); setOnlyFavorites(false); }}>Limpar filtros</Button>}
      </View>
      {!loading && !error && !visible?.length && (
        <Empty
          title={
            onlyFavorites ? "Nenhum favorito neste filtro" : data?.length
              ? "Sem resultados na busca"
              : "Você ainda não cadastrou exercícios."
          }
          description={onlyFavorites ? "Toque na estrela de um exercício para adicioná-lo aos favoritos ou ajuste os filtros." : "Cadastre um exercício ou ajuste os filtros."}
        />
      )}
      {visible?.map((e) => (
        <View key={e.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable accessibilityRole="button"
            accessibilityLabel={`${expanded.includes(e.id) ? "Recolher" : "Expandir"} exercício ${e.name}`}
            aria-expanded={expanded.includes(e.id)}
            onPress={() => setExpanded(current => current.includes(e.id) ? current.filter(id => id !== e.id) : [...current, e.id])}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, minHeight: 86, backgroundColor: pressed ? t.backgroundElement : t.background })}>
            <View style={{ width: 64, height: 64, backgroundColor: t.accentSoft, borderRadius: 6, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <ExerciseThumbnail key={`${e.videoUrl}:${e.imageUrl}`} exercise={e} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Label bold size={15}>{e.name}</Label>
              <View style={[s.row, { gap: 5 }]}><Badge>{e.muscleGroup}</Badge><Badge>{e.category}</Badge></View>
            </View>
            <Label size={20}>{expanded.includes(e.id) ? "−" : "+"}</Label>
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel={`${isFavorite(e) ? "Remover dos favoritos" : "Favoritar exercício"} ${e.name}`}
            accessibilityState={{ disabled: savingFavorites.includes(e.id), busy: savingFavorites.includes(e.id) }}
            aria-pressed={isFavorite(e)} disabled={savingFavorites.includes(e.id)}
            onPress={() => void saveFavorite(e)}
            style={({ pressed }) => ({ minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center", opacity: savingFavorites.includes(e.id) ? 0.4 : pressed ? 0.6 : 1 })}>
            <Label size={26}>{isFavorite(e) ? "★" : "☆"}</Label>
          </Pressable>
          </View>
          {select && <View style={{ padding: 8, borderTopWidth: 1, borderColor: t.border }}>
            <Button variant="secondary" onPress={() => select(e)}>+ Adicionar ao treino</Button>
          </View>}
          {expanded.includes(e.id) && <View style={{ padding: 14, borderTopWidth: 1, borderColor: t.border }}>
          <ExerciseDetails exercise={e} />
          <View style={s.row}>
            <Button variant="secondary" onPress={() => setEdit(e)}>
              Editar exercício
            </Button>
            <Button variant="secondary" onPress={() => setArchive(e)}>
              {e.status === "ativo"
                ? "Arquivar exercício"
                : "Restaurar exercício"}
            </Button>
          </View>
          </View>}
        </View>
      ))}
      </View>
      {edit && edit !== "new" && <Dialog title={`Editar ${edit.name}`} onClose={() => setEdit(null)}>
        <ExerciseForm
          key={edit.id}
          exercises={data ?? []}
          exercise={edit}
          cancel={() => setEdit(null)}
          done={() => {
            setEdit(null);
            void reload();
          }}
        />
      </Dialog>}
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
