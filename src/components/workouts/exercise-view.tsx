import { exerciseVideoSource } from "@/features/personal/exercise-video";
import { ExerciseVideo } from "./exercise-video";
import { Image, Linking, Pressable, View } from "react-native";
import { useState } from "react";
import { Button, Label, Notice } from "@/components/personal/ui";
import type { Exercise, Prescription } from "../../../shared/workouts";
export function ExerciseDetails({ exercise, collapsible = false }: { exercise: Exercise; collapsible?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = !collapsible || expanded;
  const [error, setError] = useState("");
  const video = exerciseVideoSource(exercise.videoUrl);
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Label size={18} bold>
        {exercise.name}
      </Label>
      <Label muted>
        {exercise.muscleGroup} · {exercise.category}
        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
      </Label>
      {collapsible && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Recolher" : "Expandir"} exercício ${exercise.name}`}
          aria-expanded={expanded}
          onPress={() => setExpanded(value => !value)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Label bold>{expanded ? "Recolher exercício ▴" : "Expandir exercício ▾"}</Label>
        </Pressable>
      )}
      {visible && <>
      {!!exercise.description && <Label>{exercise.description}</Label>}
      {!!exercise.notes && <Label>{exercise.notes}</Label>}
      {!!exercise.imageUrl && (
        <Image
          source={{ uri: exercise.imageUrl }}
          accessibilityLabel={exercise.name}
          style={{ width: "100%", height: 180 }}
          resizeMode="contain"
          onError={() => setError("Não foi possível carregar a imagem.")}
        />
      )}
      {video && (
        <ExerciseVideo key={video.url} source={video} title={exercise.name} />
      )}
      {!!exercise.videoUrl && !video && (
        <Button
          variant="secondary"
          onPress={() => {
            void Linking.openURL(exercise.videoUrl).catch(() =>
              setError("Não foi possível abrir o vídeo."),
            );
          }}
        >
          Abrir link de vídeo
        </Button>
      )}
      <Notice error>{error}</Notice>
      </>}
    </View>
  );
}
export function PrescriptionView({ item }: { item: Prescription }) {
  const values = [
    item.sets !== null ? `${item.sets} séries` : "",
    item.repetitions ? `${item.repetitions} repetições` : "",
    item.load !== null ? `${item.load} kg` : "",
    item.durationSeconds !== null ? `Duração: ${item.durationSeconds} s` : "",
    item.restSeconds !== null ? `Descanso: ${item.restSeconds} s` : "",
    item.rir !== null ? `RIR: ${item.rir}` : "",
    item.rpe !== null ? `RPE: ${item.rpe}` : "",
    item.cadence ? `Cadência: ${item.cadence}` : "",
  ].filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {item.exercise && <ExerciseDetails exercise={item.exercise} />}
      {!!item.series?.length && <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>{["Série/rep", "Carga", "Intervalo"].map(label => <View key={label} style={{ flex: 1 }}><Label size={12} bold>{label}</Label></View>)}</View>
        {item.series.map((row, i) => <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Label>{row.sets}/{row.repetitions}</Label></View>
          <View style={{ flex: 1 }}><Label>{row.load === null ? "—" : `${row.load} kg`}</Label></View>
          <View style={{ flex: 1 }}><Label>{row.restSeconds === null ? "—" : `${row.restSeconds} s`}</Label></View>
        </View>)}
      </View>}
      {values.filter(v => !item.series?.length || !(/ séries$| repetições$| kg$|^Descanso:/.test(v))).map((v) => (
        <Label key={v}>{v}</Label>
      ))}
      {!!item.notes && <Notice>{item.notes}</Notice>}
    </View>
  );
}
