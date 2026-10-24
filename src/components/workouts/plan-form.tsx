import { useState } from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  Choices,
  Confirm,
  Label,
  s,
} from "@/components/personal/ui";
import { api, today } from "@/features/personal/api";
import { planSchema, type Plan, type PlanData } from "../../../shared/workouts";
import { SaveForm, TextFields } from "./form";
import { identifyWorkout, prescriptionKey, move, WorkoutEditor } from "./workout-editor";
import { PreparedWorkouts } from "./prepared-workouts";
import { canPersistExerciseOrder } from "../../../shared/workout-groups";
export function PlanForm({
  studentId,
  plan,
  done,
  cancel,
  initialWorkout = null,
  initialPicker = false,
  initialTemplatePicker = false,
}: {
  initialTemplatePicker?: boolean;
  initialWorkout?: number | null;
  initialPicker?: boolean;
  studentId: string;
  plan?: Plan;
  done: () => void;
  cancel: () => void;
}) {
  const [data, setData] = useState<PlanData>(
    plan ? { ...plan, workouts: plan.workouts.map(identifyWorkout) } : {
      title: "",
      objective: "Adaptação",
      difficulty: "Iniciante",
      startsAt: today(),
      endsAt: null,
      instructions: "",
      status: "rascunho",
      workouts: [],
    },
  );
  const [open, setOpen] = useState<number | null>(initialWorkout);
  const [remove, setRemove] = useState<number | null>(null);
  const [pending, setPending] = useState(initialPicker);
  const [templatePicker, setTemplatePicker] = useState(initialTemplatePicker);
  const [pickerWorkout, setPickerWorkout] = useState(initialPicker ? initialWorkout : null);
  return (
    <SaveForm
      label="Salvar plano"
      cancel={cancel}
      save={async () => {
        if (pending)
          throw new Error(
            "Confirme ou cancele a prescrição aberta antes de salvar.",
          );
        const parsed = planSchema.safeParse(data);
        if (!parsed.success)
          throw new Error(
            parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(" · "),
          );
        await api(
          plan
            ? `/workout-plans/${plan.id}`
            : `/students/${studentId}/workout-plans`,
          plan ? "PUT" : "POST",
          parsed.data,
        );
        done();
      }}
    >
      <TextFields
        value={data}
        change={setData}
        fields={[
          ["title", "Nome do plano *"],
          ["objective", "Objetivo *"],
          ["startsAt", "Data de início (AAAA-MM-DD) *"],
          ["endsAt", "Data de término (AAAA-MM-DD)"],
          ["instructions", "Orientações gerais"],
        ]}
      />
      <Choices
        label="Dificuldade"
        value={data.difficulty}
        onChange={(v) =>
          setData({ ...data, difficulty: v as PlanData["difficulty"] })
        }
        options={["Iniciante", "Intermediário", "Avançado"].map((value) => ({
          value,
          label: value,
        }))}
      />
      <Choices
        label="Status do plano"
        value={data.status}
        onChange={(v) => setData({ ...data, status: v as PlanData["status"] })}
        options={(plan?.publishedAt
          ? ["ativo", "arquivado"]
          : ["rascunho", "ativo", "arquivado"]
        ).map((value) => ({ value, label: value }))}
      />
      <Label muted>
        Ao salvar como ativo, o plano será disponibilizado à conta vinculada
        deste aluno. Todas as alterações abaixo são salvas juntas.
      </Label>
      {!data.workouts.length && (
        <Label>Este plano ainda não possui treinos.</Label>
      )}
      <Button disabled={pending || data.workouts.length >= 30} variant="secondary" onPress={() => setTemplatePicker(!templatePicker)}>
        {templatePicker ? "Fechar treinos preparados" : "Usar treino preparado"}
      </Button>
      {templatePicker && !pending && <Card>
        <PreparedWorkouts select={workout => {
          setData(current => ({ ...current, workouts: [...current.workouts, identifyWorkout(workout)] }));
          setOpen(data.workouts.length);
          setTemplatePicker(false);
        }} />
      </Card>}
      {data.workouts.map((w, index) => (
        <Card key={w.id ?? `new-${index}`}>
          <Label size={20} bold>
            {index + 1}. {w.name || "Novo treino"}
          </Label>
          <View style={s.row}>
            <Button
              disabled={pending}
              variant="secondary"
              onPress={() => setOpen(open === index ? null : index)}
            >
              {open === index ? "Recolher treino" : "Editar treino"}
            </Button>
            <Button
              disabled={pending}
              variant="secondary"
              onPress={() => {
                const copy = {
                  ...identifyWorkout({ ...w, exercises: w.exercises.map(e => ({ ...e, id: undefined, clientId: undefined })) }),
                  id: undefined,
                  name: `${w.name} (cópia)`,

                };
                setData({ ...data, workouts: [...data.workouts, copy] });
                setOpen(data.workouts.length);
              }}
            >
              Duplicar treino
            </Button>
            <Button
              label={`Subir treino ${index + 1}`}
              disabled={pending || index === 0}
              variant="secondary"
              onPress={() => {
                setData({ ...data, workouts: move(data.workouts, index, -1) });
                setOpen(null);
              }}
            >
              ↑
            </Button>
            <Button
              label={`Descer treino ${index + 1}`}
              disabled={pending || index === data.workouts.length - 1}
              variant="secondary"
              onPress={() => {
                setData({ ...data, workouts: move(data.workouts, index, 1) });
                setOpen(null);
              }}
            >
              ↓
            </Button>
            <Button
              disabled={pending}
              variant="danger"
              onPress={() => setRemove(index)}
            >
              Excluir treino
            </Button>
          </View>
          {open === index && (
            <WorkoutEditor
              workout={w}
              persistOrder={plan && w.id && canPersistExerciseOrder(plan.workouts.find(previous => previous.id === w.id)?.exercises, w.exercises) ? async items => {
                const result = await api<{ revision: number }>("/workout-plans/" + plan.id + "/workouts/" + w.id + "/order", "PUT", { revision: data.revision, ids: items.map(prescriptionKey) });
                setData(current => ({ ...current, revision: result.revision }));
              } : undefined}
              initialPicker={index === pickerWorkout}
              pending={(value) => { setPending(value); setPickerWorkout(null); }}
              change={(next) =>
                setData(current => ({
                  ...current,
                  workouts: current.workouts.map((x, i) => i === index ? next : x),
                }))
              }
            />
          )}
        </Card>
      ))}
      <Button
        disabled={pending}
        variant="secondary"
        onPress={() => {
          setData({
            ...data,
            workouts: [
              ...data.workouts,
              {
                name: `Treino ${String.fromCharCode(65 + data.workouts.length)}`,
                subtitle: "",
                instructions: "",
                exercises: [],
              },
            ],
          });
          setOpen(data.workouts.length);
        }}
      >
        + Adicionar treino
      </Button>
      {remove !== null && (
        <Confirm
          title="Excluir este treino?"
          description="Esta ação removerá o treino desta rotina ao salvar o plano."
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            setData({
              ...data,
              workouts: data.workouts.filter((_, i) => i !== remove),
            });
            setOpen(null);
          }}
        />
      )}
    </SaveForm>
  );
}
