import { Image, Linking, View } from "react-native";
import { useState } from "react";
import { Button, Label, Notice } from "@/components/personal/ui";
import type { Exercise, Prescription } from "../../../shared/workouts";
export function ExerciseDetails({ exercise }: { exercise: Exercise }) {
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Label size={18} bold>
        {exercise.name}
      </Label>
      <Label muted>
        {exercise.muscleGroup} · {exercise.category}
        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
      </Label>
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
      {!!exercise.videoUrl && (
        <Button
          variant="secondary"
          onPress={() => {
            void Linking.openURL(exercise.videoUrl).catch(() =>
              setError("Não foi possível abrir o vídeo."),
            );
          }}
        >
          Abrir vídeo
        </Button>
      )}
      <Notice error>{error}</Notice>
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
      {values.map((v) => (
        <Label key={v}>{v}</Label>
      ))}
      {!!item.notes && <Notice>{item.notes}</Notice>}
    </View>
  );
}
