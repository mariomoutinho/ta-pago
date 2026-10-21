import { useState } from "react";
import { View } from "react-native";
import { useResource } from "@/features/personal/use-resource";
import { api, formatDate, today } from "@/features/personal/api";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Dialog,
  Empty,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import type { Plan } from "../../../shared/workouts";
import { PlanForm } from "./plan-form";
import { PrescriptionView } from "./exercise-view";
function PlanCard({
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
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [archive, setArchive] = useState<Plan | null>(null);
  const [discard, setDiscard] = useState(false);
  const [success, setSuccess] = useState("");
  const plans =
    data?.filter((p) => !studentId || p.studentId === studentId) ?? [];
  const groups: [string, (p: Plan) => boolean][] = [
    [
      "Planos atuais",
      (p) =>
        p.status === "ativo" &&
        p.startsAt <= today() &&
        (!p.endsAt || p.endsAt >= today()),
    ],
    ["Planos futuros", (p) => p.status === "ativo" && p.startsAt > today()],
    [
      "Planos encerrados",
      (p) => p.status === "ativo" && !!p.endsAt && p.endsAt < today(),
    ],
    ["Rascunhos", (p) => p.status === "rascunho"],
    ["Planos arquivados", (p) => p.status === "arquivado"],
  ];
  return (
    <View style={{ gap: 12 }}>
      <Label size={24} bold>
        {studentView ? "Meu treino" : "Treinos"}
      </Label>
      <Notice>{success}</Notice>
      <Notice error>{error}</Notice>
      {loading && <Notice>Carregando planos…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      {!studentView && (
        <Button onPress={() => setEditing("new")}>+ Criar treino</Button>
      )}
      {!loading && !error && !plans.length && (
        <Empty
          title={
            studentView
              ? "Você ainda não possui um treino atribuído."
              : "Este aluno ainda não possui um treino."
          }
          description={
            studentView
              ? "Seus planos publicados pelo personal aparecerão aqui."
              : "Crie um plano e organize os treinos deste aluno."
          }
        />
      )}
      {groups.map(([title, filter]) => {
        const list = plans.filter(filter);
        return list.length ? (
          <View key={title}>
            <Label size={18} bold>
              {title}
            </Label>
            {list.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                edit={studentView ? undefined : () => setEditing(plan)}
                archive={studentView ? undefined : () => setArchive(plan)}
              />
            ))}
          </View>
        ) : null;
      })}
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
