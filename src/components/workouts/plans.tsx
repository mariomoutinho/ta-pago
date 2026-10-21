import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api, formatDate, today } from "@/features/personal/api";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Dialog,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import type { Plan } from "../../../shared/workouts";
import { PlanForm } from "./plan-form";
import { PrescriptionView } from "./exercise-view";
function PlanDetails({
  plan,
  edit,
  archive,
}: {
  plan: Plan;
  edit?: () => void;
  archive?: () => void;
}) {
  const [open, setOpen] = useState<string | number | null>(null);
  return (
    <Card>
      <Label size={22} bold>
        {plan.title}
      </Label>
      {plan.student && (
        <Label muted>Personal: {plan.student.personal.name}</Label>
      )}
      <Badge>
        {plan.status} · {plan.difficulty}
      </Badge>
      <Label>{plan.objective}</Label>
      <Label muted>
        {formatDate(plan.startsAt)} →{" "}
        {plan.endsAt ? formatDate(plan.endsAt) : "Sem término definido"}
      </Label>
      {!!plan.instructions && <Notice>{plan.instructions}</Notice>}
      <View style={s.row}>
        {edit && <Button onPress={edit}>Editar plano</Button>}
        {archive && plan.status !== "arquivado" && (
          <Button variant="secondary" onPress={archive}>
            Arquivar plano
          </Button>
        )}
      </View>
      {!plan.workouts.length && (
        <Notice>Este plano ainda não possui treinos.</Notice>
      )}
      {plan.workouts.map((w, i) => (
        <View key={w.id ?? i} style={{ marginTop: 16, gap: 10 }}>
          <Button
            variant="secondary"
            onPress={() => setOpen(open === (w.id ?? i) ? null : (w.id ?? i))}
          >
            {w.name}
            {w.subtitle ? ` · ${w.subtitle}` : ""}
          </Button>
          {open === (w.id ?? i) && (
            <>
              {!!w.instructions && <Notice>{w.instructions}</Notice>}
              {!w.exercises.length && (
                <Label>Este treino ainda não possui exercícios.</Label>
              )}
              {w.exercises.map((e, index) => (
                <Card key={e.id ?? index}>
                  <Label bold>{index + 1}.</Label>
                  <PrescriptionView item={e} />
                </Card>
              ))}
            </>
          )}
        </View>
      ))}
    </Card>
  );
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
        <PlanDetails plan={selectedPlan} edit={studentView ? undefined : () => setEditing(selectedPlan)}
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
            plan={editing === "new" ? undefined : editing}
            cancel={() => setDiscard(true)}
            done={() => {
              if (editing === "new") {
                setSection("Rotinas de treino");
                setFilter("Todas");
                setSelected(null);
              }
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
          onConfirm={async () => setEditing(null)}
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
