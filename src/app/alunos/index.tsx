import { useState, useEffect } from "react";
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { useResource } from "@/features/personal/use-resource";
import type { Student, Program } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import {
  Badge,
  Button,
  Card,
  Choices,
  Dialog,
  Empty,
  Field,
  Heading,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import { StudentForm } from "@/components/personal/forms";
export default function Students() {
  const requests = useResource<
    import("../../../shared/enrollment").EnrollmentSummary[]
  >("/enrollment/requests");
  useEffect(() => {
    const timer = setInterval(() => void requests.reload(), 15000);
    return () => clearInterval(timer);
  }, [requests.reload]);
  const { data, error, loading } = useResource<Student[]>("/students");
  const { data: programs } = useResource<Program[]>("/programs");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(false);
  const students = (data ?? []).filter(
    (x) =>
      x.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")) &&
      (!status || x.status === status),
  );
  return (
    <Page>
      <Heading
        title="Meus alunos"
        subtitle="Cada pessoa tem seu ritmo. Acompanhe toda a trajetória."
        action={
          <View style={s.row}>
            <Button
              variant="secondary"
              onPress={() => router.push("/alunos/link" as Href)}
            >
              Link de Cadastro
            </Button>
            <Button onPress={() => setCreate(true)}>Novo aluno</Button>
          </View>
        }
      />
      <Notice error>{error || requests.error}</Notice>
      <Card>
        <View style={s.row}>
          <Label>
            Ativos: {(data ?? []).filter((x) => x.status === "ativo").length}
          </Label>
          <Label>
            Pendentes:{" "}
            {(requests.data ?? []).filter((x) => x.status === "pending").length}
          </Label>
          <Label>
            Recebidos nos últimos 7 dias:{" "}
            {
              (requests.data ?? []).filter(
                (x) => Date.now() - Date.parse(x.createdAt) < 7 * 86400000,
              ).length
            }
          </Label>
        </View>
        <Button
          variant="secondary"
          onPress={() => router.push("/alunos/link" as Href)}
        >
          Ver cadastros recebidos
        </Button>
      </Card>
      <Field
        label="Buscar aluno"
        placeholder="Nome do aluno"
        value={search}
        onChangeText={setSearch}
      />
      <Choices
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "", label: "Todos" },
          ...["ativo", "pausado", "inativo"].map((value) => ({
            value,
            label: value,
          })),
        ]}
      />
      {loading ? (
        <Notice>Carregando alunos…</Notice>
      ) : students.length ? (
        <View style={s.grid}>
          {students.map((x) => (
            <Card key={x.id} style={s.column}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Label size={20} bold>
                  {x.name}
                </Label>
                <Badge>{x.status}</Badge>
              </View>
              <View style={{ marginVertical: 14, gap: 8 }}>
                <Label muted>{x.mainGoal}</Label>
                <Label size={12}>
                  {x.weeklyFrequency}× por semana ·{" "}
                  {x.program?.name ?? "Sem programa"}
                </Label>
                <Label size={11} muted>
                  {x.accountId
                    ? "Conta de aluno vinculada"
                    : "Acompanhamento local"}
                </Label>
              </View>
              <Button
                variant="secondary"
                onPress={() => router.push(`/alunos/${x.id}` as Href)}
              >
                Ver acompanhamento →
              </Button>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Empty
            title="Nenhum aluno encontrado"
            description="Cadastre um aluno ou ajuste os filtros de busca."
            action={
              <Button onPress={() => setCreate(true)}>Cadastrar aluno</Button>
            }
          />
        </Card>
      )}
      {create && (
        <Dialog title="Cadastrar aluno" onClose={() => setCreate(false)}>
          <StudentForm
            programs={programs ?? []}
            onSaved={(x) => {
              setCreate(false);
              router.push(`/alunos/${x.id}` as Href);
            }}
          />
        </Dialog>
      )}
    </Page>
  );
}
