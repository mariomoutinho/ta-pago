import { exerciseVideoSource } from "@/features/personal/exercise-video";
import { ExerciseVideo } from "./exercise-video";
import { Image, Linking, Pressable, View } from "react-native";
import { useState } from "react";
import { Button, Label, Notice } from "@/components/personal/ui";
import type { Exercise, Prescription } from "../../../shared/workouts";
import { seriesFields, seriesValue } from "../../../shared/series";
export function ExerciseDetails({ exercise, collapsible = false, compact = false }: { exercise: Exercise; collapsible?: boolean; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = !collapsible || expanded;
  const [error, setError] = useState("");
  const video = exerciseVideoSource(exercise.videoUrl);
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      {!compact && <><Label size={18} bold>
        {exercise.name}
      </Label>
      <Label muted>
        {exercise.muscleGroup} · {exercise.category}
        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
      </Label></>}
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
      {!compact && !!exercise.description && <Label>{exercise.description}</Label>}
      {!compact && !!exercise.notes && <Label>{exercise.notes}</Label>}
      {!!exercise.imageUrl && !video && (
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
export function PrescriptionView({ item, hideSeries = false }: { item: Prescription; hideSeries?: boolean }) {
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
      {item.exercise && <ExerciseDetails exercise={item.exercise} compact />}
      {!hideSeries && !!item.series?.length && <View style={{ gap: 8 }}>
        {item.series.map((row, i) => <View key={i} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {seriesFields(row.type ?? "repetitions-load").map(field => <View key={field.key} style={{ flex: 1, minWidth: 70, gap: 4 }}><Label size={12} bold>{field.label}</Label><Label>{seriesValue(row, field.key) || "—"}</Label></View>)}
        </View>)}
      </View>}
      {values.filter(v => !(hideSeries || item.series?.length) || !(/ séries$| repetições$| kg$|^Descanso:|^Duração:/.test(v))).map((v) => (
        <Label key={v}>{v}</Label>
      ))}
      {!!item.notes && <Notice>{item.notes}</Notice>}
      {item.alternativeExercise && <Notice>{"Alternativa: " + item.alternativeExercise.name + ". Utilize somente como alternativa ao exercício principal, seguindo a prescrição e as orientações do personal."}</Notice>}
    </View>
  );
}
