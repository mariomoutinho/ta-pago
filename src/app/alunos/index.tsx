import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { router, type Href } from "expo-router";
import { useResource } from "@/features/personal/use-resource";
import type { Student, Program } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import {
  Button,
  Card,
  Dialog,
  Empty,
  Field,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import { StudentForm } from "@/components/personal/forms";
import { StudentListRow } from "@/components/personal/student-list-row";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
export default function Students() {
  const t = useTheme();
  const requests = useResource<
    import("../../../shared/enrollment").EnrollmentSummary[]
  >("/enrollment/requests");
  useEffect(() => {
    const timer = setInterval(() => void requests.reload(), 15000);
    return () => clearInterval(timer);
  }, [requests.reload]);
  const { data, error, loading, reload } = useResource<Student[]>("/students");
  const programs = useResource<Program[]>("/programs");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(false);
  const query = normalize(search);
  const phoneQuery = search.replace(/\D/g, "");
  const students = (data ?? [])
    .filter((x) => {
      const matches =
        normalize(x.name).includes(query) ||
        normalize(x.email).includes(query) ||
        (!!phoneQuery &&
          /^[\d\s()+.-]+$/.test(search) &&
          x.phone.replace(/\D/g, "").includes(phoneQuery));
      return matches && (!status || x.status === status);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const pending = requests.data?.filter((x) => x.status === "pending").length;
  const count = (value: string) =>
    !data || error
      ? "—"
      : data.filter((x) => !value || x.status === value).length;
  return (
    <Page>
      <View style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
        <View
          style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: Fonts.sans,
              fontSize: 24,
              fontWeight: "700",
              color: t.text,
            }}
          >
            Meus alunos
          </Text>
          <Button variant="secondary" onPress={() => router.push("/")}>
            ‹ Início
          </Button>
        </View>
        <Card style={{ padding: 16 }}>
          <Field
            label="Buscar aluno"
            placeholder="Nome, e-mail ou telefone"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
            {[
              { value: "", label: `Todos: ${count("")}` },
              { value: "ativo", label: `Ativos: ${count("ativo")}` },
              { value: "pausado", label: `Pausados: ${count("pausado")}` },
              { value: "inativo", label: `Inativos: ${count("inativo")}` },
            ].map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`Status: ${option.label}`}
                accessibilityState={{ checked: status === option.value }}
                onPress={() => setStatus(option.value)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: 22,
                  backgroundColor:
                    status === option.value
                      ? t.accentSoft
                      : t.backgroundElement,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.sans,
                    textAlign: "center",
                    fontSize: 11,
                    color: status === option.value ? t.accent : t.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[s.row, { justifyContent: "center", marginBottom: 16 }]}>
            <Button onPress={() => setCreate(true)}>+ Adicionar aluno</Button>
            <Button
              variant="secondary"
              onPress={() => router.push("/alunos/link" as Href)}
            >
              Link de Cadastro
            </Button>
          </View>
          <Notice error>{error}</Notice>
          {error && (
            <Button variant="secondary" onPress={() => void reload()}>
              Tentar novamente
            </Button>
          )}
          {loading ? (
            <Notice>Carregando alunos…</Notice>
          ) : (
            !error &&
            (students.length ? (
              <>
                <Label muted size={11}>
                  {students.length}{" "}
                  {students.length === 1
                    ? "aluno encontrado"
                    : "alunos encontrados"}
                </Label>
                {students.map((student) => (
                  <StudentListRow key={student.id} student={student} />
                ))}
              </>
            ) : (
              <Empty
                title="Nenhum aluno encontrado"
                description={
                  data?.length
                    ? "Tente outro nome, e-mail, telefone ou filtro."
                    : "Adicione seu primeiro aluno ou compartilhe o link de cadastro."
                }
              />
            ))
          )}
        </Card>
        <Notice error>{requests.error}</Notice>
        <Card style={{ padding: 16 }}>
          <View style={{ gap: 12 }}>
            <Label bold>Cadastros recebidos</Label>
            <Label muted>
              Pendentes:{" "}
              {requests.error || pending === undefined ? "—" : pending} ·
              Últimos 7 dias:{" "}
              {requests.error || !requests.data
                ? "—"
                : requests.data.filter(
                    (x) => Date.now() - Date.parse(x.createdAt) < 7 * 86400000,
                  ).length}
            </Label>
            <Button
              variant="secondary"
              onPress={() => router.push("/alunos/link" as Href)}
            >
              Ver cadastros recebidos
            </Button>
          </View>
        </Card>
        {create && (
          <Dialog title="Cadastrar aluno" onClose={() => setCreate(false)}>
            {programs.error ? (
              <>
                <Notice error>{programs.error}</Notice>
                <Button onPress={() => void programs.reload()}>
                  Tentar novamente
                </Button>
              </>
            ) : !programs.data ? (
              <Notice>Carregando formulário…</Notice>
            ) : (
              <StudentForm
                programs={programs.data}
                onSaved={(x) => {
                  setCreate(false);
                  router.push(`/alunos/${x.id}` as Href);
                }}
              />
            )}
          </Dialog>
        )}
      </View>
    </Page>
  );
}
