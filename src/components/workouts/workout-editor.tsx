import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Confirm, Label, s } from "@/components/personal/ui";
import {
  prescriptionSchema,
  type Prescription,
  type WorkoutData,
} from "../../../shared/workouts";
import { TextFields } from "./form";
import { ExerciseLibrary } from "./exercise-library";
import { PrescriptionForm } from "./prescription-form";
import { PrescriptionView } from "./exercise-view";
export function move<T>(items: T[], index: number, step: number) {
  const next = [...items];
  if (index + step < 0 || index + step >= next.length) return next;
  [next[index], next[index + step]] = [next[index + step], next[index]];
  return next;
}
export function WorkoutEditor({
  workout,
  change,
  pending,
  initialPicker = false,
}: {
  initialPicker?: boolean;
  workout: WorkoutData;
  change: (w: WorkoutData) => void;
  pending: (value: boolean) => void;
}) {
  const [picker, setPicker] = useState(initialPicker);
  const [edit, setEdit] = useState<{
    item: Prescription;
    index: number;
  } | null>(null);
  const [remove, setRemove] = useState<number | null>(null);
  return (
    <View style={{ gap: 12 }}>
      <TextFields
        value={workout}
        change={change}
        fields={[
          ["name", "Nome do treino *"],
          ["subtitle", "Subtítulo"],
          ["instructions", "Orientações do treino"],
        ]}
      />
      {!workout.exercises.length && (
        <Label muted>Este treino ainda não possui exercícios.</Label>
      )}
      {workout.exercises.map((item, index) => (
        <Card key={item.id ?? `new-${index}`}>
          <Label bold>Exercício {index + 1}</Label>
          <PrescriptionView item={item} />
          <View style={s.row}>
            <Button
              disabled={!!edit || picker}
              variant="secondary"
              onPress={() => {
                setEdit({ item, index });
                pending(true);
              }}
            >
              Editar prescrição
            </Button>
            <Button
              label={`Subir exercício ${index + 1}`}
              disabled={index === 0 || !!edit}
              variant="secondary"
              onPress={() =>
                change({
                  ...workout,
                  exercises: move(workout.exercises, index, -1),
                })
              }
            >
              ↑
            </Button>
            <Button
              label={`Descer exercício ${index + 1}`}
              disabled={index === workout.exercises.length - 1 || !!edit}
              variant="secondary"
              onPress={() =>
                change({
                  ...workout,
                  exercises: move(workout.exercises, index, 1),
                })
              }
            >
              ↓
            </Button>
            <Button
              disabled={!!edit}
              variant="danger"
              onPress={() => setRemove(index)}
            >
              Remover exercício
            </Button>
          </View>
        </Card>
      ))}
      {edit && (
        <Card>
          <PrescriptionForm
            item={edit.item}
            cancel={() => {
              setEdit(null);
              pending(false);
            }}
            done={(item) => {
              const exercises = [...workout.exercises];
              exercises[edit.index] = item;
              change({ ...workout, exercises });
              setEdit(null);
              pending(false);
            }}
          />
        </Card>
      )}
      {picker ? (
        <Card>
          <Label size={20} bold>Adicionar exercício</Label>
          <Button variant="secondary" onPress={() => { setPicker(false); pending(false); }}>Fechar biblioteca</Button>
          <ExerciseLibrary
            select={(exercise) => {
              setEdit({
                item: {
                  ...prescriptionSchema.parse({ exerciseId: exercise.id }),
                  exercise,
                },
                index: workout.exercises.length,
              });
              setPicker(false);
            }}
          />
        </Card>
      ) : (
        !edit && (
          <Button
            onPress={() => {
              setPicker(true);
              pending(true);
            }}
          >
            + Adicionar exercício
          </Button>
        )
      )}
      {remove !== null && (
        <Confirm
          title="Remover exercício?"
          description="A prescrição será removida deste treino ao salvar o plano."
          onClose={() => setRemove(null)}
          onConfirm={async () =>
            change({
              ...workout,
              exercises: workout.exercises.filter((_, i) => i !== remove),
            })
          }
        />
      )}
    </View>
  );
}
