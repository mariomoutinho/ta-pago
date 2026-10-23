import { WorkoutFeedbacks } from "./feedbacks";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api, formatDate, today } from "@/features/personal/api";
import {
  Button,
  Card,
  Confirm,
  Dialog,
  Label,
  Notice,
} from "@/components/personal/ui";
import type { Plan } from "../../../shared/workouts";
import { PlanForm } from "./plan-form";
import { WorkoutWindow } from "./workout-window";
function PlanDetails({ plan, edit, archive, add, studentView, reload, editWorkout }: {
  plan: Plan; edit?: () => void; archive?: () => void; add?: () => void;
  studentView: boolean; reload: () => Promise<void>;
  editWorkout?: (index: number, picker: boolean) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState<string | number | null>(null);
  const [menu, setMenu] = useState(false);
  const card = { padding: 16, borderRadius: 8, marginBottom: 0, backgroundColor: t.backgroundElement, borderWidth: 0 };
  return <View style={{ gap: 14 }}>
    <Card style={card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Label size={22}>↔</Label></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Label size={16} bold>{plan.title}</Label>
          <Label size={11} muted>{formatDate(plan.startsAt)} – {plan.endsAt ? formatDate(plan.endsAt) : "Sem término definido"}</Label>
          <Label size={12}>{plan.objective} · {plan.difficulty}</Label>
        </View>
        {edit && <Pressable accessibilityRole="button" accessibilityLabel="Opções desta rotina" onPress={() => setMenu(true)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Label size={22}>⋮</Label></Pressable>}
      </View>
      <View style={{ gap: 12 }}>
        <View><Label size={12} bold>Status da rotina</Label><Label size={13}>{plan.status === "ativo" ? "Ativa" : plan.status === "rascunho" ? "Rascunho" : "Arquivada"}</Label></View>
        <View><Label size={12} bold>Visibilidade para o aluno</Label><Label size={13}>{plan.publishedAt ? "Publicada para o aluno vinculado" : "Ainda não publicada"}</Label></View>
        {plan.student && <View><Label size={12} bold>Personal responsável</Label><Label size={13}>{plan.student.personal.name}</Label></View>}
        {!!plan.instructions && <View><Label size={12} bold>Orientações</Label><Label size={13}>{plan.instructions}</Label></View>}
      </View>
    </Card>
    {edit && add && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <View style={{ flex: 1, minWidth: 140 }}><Button variant="secondary" onPress={edit}>Reordenar treinos</Button></View>
      <View style={{ flex: 1, minWidth: 140 }}><Button onPress={add}>+ Adicionar treino</Button></View>
    </View>}
    {!plan.workouts.length && <Notice>Esta rotina ainda não possui treinos.</Notice>}
    {plan.workouts.map((w, i) => {
      const expanded = open === (w.id ?? i);
      return <Card key={w.id ?? i} style={card}>
        <Pressable accessibilityRole="button" accessibilityLabel={w.name + (w.subtitle ? ` · ${w.subtitle}` : "")} aria-expanded={expanded}
          onPress={() => setOpen(expanded ? null : (w.id ?? i))} style={{ minHeight: 44, gap: 5 }}>
          <Label size={15} bold>{w.name}</Label>
          {!!w.subtitle && <Label size={13}>{w.subtitle}</Label>}
        </Pressable>
        <View style={{ marginVertical: 10 }}><Label size={12} muted>{w.exercises.length} exercício(s) na prescrição</Label></View>
        <Button variant="secondary" onPress={() => setOpen(expanded ? null : (w.id ?? i))}>{expanded ? "Recolher exercícios" : "Ver exercícios"}</Button>
        <View style={{ gap: 8, marginTop: 8 }}>
          <WorkoutFeedbacks workout={w} canSend={studentView && plan.status === "ativo" && plan.student?.linkStatus === "active"} reload={reload} />
        </View>
        {expanded && <WorkoutWindow workout={w} close={() => setOpen(null)}
          saveSeries={studentView ? undefined : async (index, rows) => {
            await api(`/workout-plans/${plan.id}`, "PUT", { ...plan,
              workouts: plan.workouts.map((workout, wi) => wi !== i ? workout : { ...workout,
                exercises: workout.exercises.map((exercise, ei) => ei !== index ? exercise : { ...exercise, series: rows }),
              }),
            });
            await reload();
          }}
          edit={editWorkout ? () => { setOpen(null); editWorkout(i, false); } : undefined}
          add={editWorkout ? () => { setOpen(null); editWorkout(i, true); } : undefined} />}

      </Card>;
    })}
    {menu && <Dialog title="Opções da rotina" onClose={() => setMenu(false)}>
      <View style={{ gap: 12 }}>
        <Button onPress={() => { setMenu(false); edit?.(); }}>Editar plano</Button>
        {archive && plan.status !== "arquivado" && <Button variant="secondary" onPress={() => { setMenu(false); archive(); }}>Arquivar plano</Button>}
      </View>
    </Dialog>}
  </View>;
}
function PlanCard({ plan, onOpen, onActions }: {
  plan: Plan; onOpen: () => void; onActions?: () => void;
}) {
  const t = useTheme();
  const status = plan.status === "rascunho" ? "Rascunho" : plan.status === "arquivado" ? "Arquivada"
    : plan.startsAt > today() ? "Futura" : plan.endsAt && plan.endsAt < today() ? "Encerrada" : "Atual";
  return <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: t.border, backgroundColor: t.background, borderRadius: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir rotina ${plan.title}`} onPress={onOpen}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 96, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Label size={22}>↔</Label></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Label size={14} bold>{plan.title}</Label>
        <Label size={11} muted>{formatDate(plan.startsAt)} – {plan.endsAt ? formatDate(plan.endsAt) : "Sem término definido"}</Label>
        <Label size={11} muted>{plan.objective} · {plan.difficulty}</Label>
        <Label size={11}>{status} · {plan.workouts.length} treino(s)</Label>
      </View>
    </Pressable>
    {onActions && <Pressable accessibilityRole="button" accessibilityLabel={`Opções da rotina ${plan.title}`} onPress={onActions}
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 6 }}><Label size={22}>⋮</Label></Pressable>}
  </View>;
}
export function WorkoutPlans({
  studentId,
  studentView = false,
}: {
  studentId?: string;
  studentView?: boolean;
}) {
  const { data, loading, error, reload } = useResource<Plan[]>(
    studentView ? "/me/workout-plans" : `/students/${studentId}/workout-plans`,
  );
  const t = useTheme();
  const [section, setSection] = useState("Rotinas de treino");
  const [filter, setFilter] = useState("Todas");
  const [selected, setSelected] = useState<string | null>(null);
  const [actions, setActions] = useState<Plan | null>(null);
  const [initialPicker, setInitialPicker] = useState(false);
  const [initialTemplatePicker, setInitialTemplatePicker] = useState(false);
  const [initialWorkout, setInitialWorkout] = useState<number | null>(null);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [archive, setArchive] = useState<Plan | null>(null);
  const [discard, setDiscard] = useState(false);
  const [success, setSuccess] = useState("");
  const plans =
    data?.filter((p) => !studentId || p.studentId === studentId) ?? [];
  const selectedPlan = plans.find(p => p.id === selected);
  const visible = plans.filter(p => {
    if (section === "Arquivadas") return p.status === "arquivado";
    if (p.status === "arquivado") return false;
    if (filter === "Rascunhos") return p.status === "rascunho";
    if (filter === "Atuais") return p.status === "ativo" && p.startsAt <= today() && (!p.endsAt || p.endsAt >= today());
    if (filter === "Futuras") return p.status === "ativo" && p.startsAt > today();
    if (filter === "Encerradas") return p.status === "ativo" && !!p.endsAt && p.endsAt < today();
    return true;
  });
  return (
    <View style={{ gap: 12 }}>
      <Notice>{success}</Notice>
      <Notice error>{error}</Notice>
      {loading && <Notice>Carregando rotinas…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      {selectedPlan ? <>
        <Button variant="secondary" onPress={() => setSelected(null)}>‹ Todas as rotinas</Button>
        <PlanDetails key={selectedPlan.id} plan={selectedPlan} studentView={studentView} reload={reload}
          editWorkout={studentView ? undefined : (index, picker) => {
            setInitialWorkout(index); setInitialPicker(picker); setEditing(selectedPlan);
          }}
          add={studentView ? undefined : () => {
            setInitialWorkout(selectedPlan.workouts.length);
            setEditing({ ...selectedPlan, workouts: [...selectedPlan.workouts, {
              name: `Treino ${String.fromCharCode(65 + selectedPlan.workouts.length)}`,
              subtitle: "", instructions: "", exercises: [],
            }] });
          }} edit={studentView ? undefined : () => setEditing(selectedPlan)}
          archive={studentView ? undefined : () => setArchive(selectedPlan)} />
      </> : <>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {["Rotinas de treino", "Arquivadas"].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value}
            aria-selected={section === value} onPress={() => setSection(value)}
            style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 6,
              backgroundColor: section === value ? t.accentSoft : t.backgroundElement,
              borderBottomWidth: 3, borderBottomColor: section === value ? t.accent : "transparent" }}>
            <Label size={13} bold>{value}</Label>
          </Pressable>)}
        </View>
        <View style={{ backgroundColor: t.backgroundElement, borderRadius: 8, padding: 12, gap: 12 }}>
          {!studentView && <Pressable accessibilityRole="button" accessibilityLabel="Criar rotina" onPress={() => setEditing("new")}
            style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.accent, backgroundColor: t.background, borderRadius: 6 }}>
            <Label size={14} bold>+ Criar rotina</Label>
          </Pressable>}
          {!studentView && <Button variant="secondary" onPress={() => { setInitialTemplatePicker(true); setEditing("new"); }}>Usar treino preparado</Button>}
          {section !== "Arquivadas" && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {["Todas", "Atuais", "Futuras", "Encerradas", ...(!studentView ? ["Rascunhos"] : [])].map(value =>
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Filtrar rotinas: ${value}`} aria-pressed={filter === value}
                onPress={() => setFilter(value)} style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderRadius: 5, backgroundColor: filter === value ? t.accentSoft : t.background }}>
                <Label size={12}>{value}</Label>
              </Pressable>)}
          </View>}
          {!loading && !error && !visible.length && <Notice>{section === "Arquivadas" ? "Nenhuma rotina arquivada." : "Nenhuma rotina neste filtro."}</Notice>}
          {visible.map(plan => <PlanCard key={plan.id} plan={plan} onOpen={() => setSelected(plan.id)}
            onActions={studentView ? undefined : () => setActions(plan)} />)}
        </View>
      </>}
      {actions && <Dialog title={actions.title} onClose={() => setActions(null)}>
        <View style={{ gap: 12 }}>
          <Button variant="secondary" onPress={() => { setSelected(actions.id); setActions(null); }}>Ver treinos</Button>
          <Button onPress={() => { setEditing(actions); setActions(null); }}>Editar plano</Button>
          {actions.status !== "arquivado" && <Button variant="secondary" onPress={() => { setArchive(actions); setActions(null); }}>Arquivar plano</Button>}
        </View>
      </Dialog>}
      {editing && studentId && (
        <Dialog
          title={editing === "new" ? "Criar plano" : "Editar plano"}
          onClose={() => setDiscard(true)}
        >
          <PlanForm
            studentId={studentId}
            initialWorkout={initialWorkout}
            initialPicker={initialPicker}
            initialTemplatePicker={initialTemplatePicker}
            plan={editing === "new" ? undefined : editing}
            cancel={() => setDiscard(true)}
            done={() => {
              if (editing === "new") {
                setSection("Rotinas de treino");
                setFilter("Todas");
                setSelected(null);
              }
              setInitialWorkout(null); setInitialPicker(false);
              setInitialTemplatePicker(false);
              setEditing(null);
              setSuccess("Plano salvo com sucesso.");
              void reload();
            }}
          />
        </Dialog>
      )}
      {discard && (
        <Confirm
          title="Descartar alterações não salvas?"
          description="As alterações do plano ainda não foram enviadas."
          onClose={() => setDiscard(false)}
          onConfirm={async () => { setEditing(null); setInitialWorkout(null); setInitialPicker(false); setInitialTemplatePicker(false); }}
        />
      )}
      {archive && (
        <Confirm
          title="Arquivar plano?"
          description="O plano sairá dos planos ativos. O histórico publicado permanece disponível ao aluno."
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            await api(`/workout-plans/${archive.id}`, "PUT", {
              ...archive,
              status: "arquivado",
            });
            setSuccess("Plano arquivado.");
            await reload();
          }}
        />
      )}
    </View>
  );
}
