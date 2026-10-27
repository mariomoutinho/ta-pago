import { useEffect, useState } from "react";
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
import { WorkoutScreen } from "./workout-screen";
import { PreparedWorkouts } from "./prepared-workouts";
import { canPersistExerciseOrder } from "../../../shared/workout-groups";
export function PlanForm({
  studentId,
  plan,
  done,
  cancel,
  initialWorkout = null,
  initialPicker = false,
  initialGroup,
  initialTemplatePicker = false,
  addingWorkout = false,
  initialData,
  screenChanged,
}: {
  initialData?: PlanData;
  addingWorkout?: boolean;
  screenChanged?: (active: boolean) => void;
  initialTemplatePicker?: boolean;
  initialWorkout?: number | null;
  initialPicker?: boolean;
  initialGroup?: string;
  studentId: string;
  plan?: Plan;
  done: () => void;
  cancel: () => void;
}) {
  const [data, setData] = useState<PlanData>(
    plan ? { ...plan, workouts: plan.workouts.map(identifyWorkout) } : initialData ? { ...initialData, workouts: initialData.workouts.map(identifyWorkout) } : {
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
  const [focused, setFocused] = useState(initialPicker);
  const [pending, setPending] = useState(initialPicker);
  const [templatePicker, setTemplatePicker] = useState(initialTemplatePicker);
  const [pickerWorkout, setPickerWorkout] = useState(initialPicker ? initialWorkout : null);
  const childScreen = focused || templatePicker;
  useEffect(() => { screenChanged?.(childScreen); }, [childScreen, screenChanged]);
  return (
    <SaveForm
      hideActions={focused || templatePicker}
      label={addingWorkout ? "Salvar treino" : "Salvar plano"}
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
      <View style={addingWorkout || focused || templatePicker ? { display: "none" } : undefined}><TextFields
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
      </View>
      {templatePicker && !pending && <WorkoutScreen title="Escolher treino preparado" backLabel="Voltar ao plano" back={() => setTemplatePicker(false)}><Card>
        <PreparedWorkouts select={workout => {
          setData(current => ({ ...current, workouts: [...current.workouts, identifyWorkout(workout)] }));
          setOpen(data.workouts.length);
          setTemplatePicker(false);
        }} />
      </Card></WorkoutScreen>}
      {data.workouts.map((w, index) => (
        <Card key={w.id ?? `new-${index}`} style={(addingWorkout && index !== initialWorkout) || (focused && open !== index) || templatePicker ? { display: "none" } : focused ? { padding: 0, borderWidth: 0, marginBottom: 0, backgroundColor: "transparent" } : undefined}>
          <View style={focused ? { display: "none" } : undefined}>
          <Label size={20} bold>
            {index + 1}. {w.name || "Novo treino"}
          </Label>
          <View style={addingWorkout ? { display: "none" } : s.row}>
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
          </View>
          {open === index && (
            <WorkoutEditor
              screenChanged={setFocused}
              workout={w}
              persistOrder={plan && w.id && canPersistExerciseOrder(plan.workouts.find(previous => previous.id === w.id)?.exercises, w.exercises) ? async items => {
                const result = await api<{ revision: number }>("/workout-plans/" + plan.id + "/workouts/" + w.id + "/order", "PUT", { revision: data.revision, ids: items.map(prescriptionKey) });
                setData(current => ({ ...current, revision: result.revision }));
              } : undefined}
              initialPicker={index === pickerWorkout}
              initialGroup={initialGroup}
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
      <View style={addingWorkout || focused || templatePicker ? { display: "none" } : undefined}><Button
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
      </Button></View>
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
