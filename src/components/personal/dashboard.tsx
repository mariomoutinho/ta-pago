import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, type Href } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { useResource } from "@/features/personal/use-resource";
import type { Student, Program } from "@/features/personal/types";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { Page } from "./shell";
import { Button, Card, Dialog, Label, Notice, s } from "./ui";
import { StudentForm } from "./forms";

function Shortcut({
  title,
  caption,
  icon,
  onPress,
  primary = false,
}: {
  title: string;
  caption?: string;
  icon: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        {
          backgroundColor: primary ? t.accent : t.background,
          borderColor: primary ? t.accent : t.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          color: primary ? "#fff" : t.accent,
          fontSize: 26,
          fontWeight: "700",
        }}
      >
        {icon}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.sans,
          color: primary ? "#fff" : t.text,
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {title}
      </Text>
      {!!caption && (
        <Text
          style={{
            fontFamily: Fonts.sans,
            color: primary ? "#fff" : t.textSecondary,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {caption}
        </Text>
      )}
    </Pressable>
  );
}
export function PersonalDashboard() {
  const { user } = useSession();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const students = useResource<Student[]>("/students");
  const [create, setCreate] = useState(false);
  const programs = useResource<Program[]>(create ? "/programs" : null);
  const active = (students.data ?? []).filter((x) => x.status === "ativo");
  const inactive = (students.data ?? []).filter((x) => x.status === "inativo");
  const paused = (students.data ?? []).filter((x) => x.status === "pausado");
  const ready = !!students.data && !students.error;
  const count = (value: number) => (ready ? String(value) : "—");
  const go = (path: string) => router.push(path as Href);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <Page>
      <View style={[s.row, { marginBottom: 22 }]}>
        <View style={[styles.avatar, { backgroundColor: t.accentSoft }]}>
          <Text style={{ color: t.accent, fontSize: 20, fontWeight: "700" }}>
            {user?.name.trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label size={22} bold>
            {greeting}, {user?.name.split(" ")[0]}!
          </Label>
          <Label muted>Seu dia de trabalho começa aqui.</Label>
        </View>
      </View>
      <Notice error>{students.error}</Notice>
      {students.error && (
        <Button
          variant="secondary"
          onPress={() => {
            void students.reload();
          }}
        >
          Tentar novamente
        </Button>
      )}
      {students.loading && <Notice>Carregando seu painel…</Notice>}
      <View
        style={{
          flexDirection: width >= 900 ? "row" : "column",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <View style={{ flex: width >= 900 ? 1 : undefined, minWidth: 0 }}>
          <Card>
            <Label size={18} bold>
              Seus alunos
            </Label>
            <View style={styles.grid}>
              <Shortcut
                title="Adicionar aluno"
                icon="+"
                primary
                onPress={() => setCreate(true)}
              />
              <Shortcut
                title="Link de cadastro"
                icon="↗"
                primary
                onPress={() => go("/alunos/link")}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver meus alunos"
              onPress={() => go("/alunos")}
              style={[
                styles.studentRow,
                { backgroundColor: t.backgroundElement },
              ]}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Label size={16} bold>
                  Meus alunos
                </Label>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  <Label size={12}>Ativos: {count(active.length)}</Label>
                  <Label size={12}>Pausados: {count(paused.length)}</Label>
                  <Label size={12}>Inativos: {count(inactive.length)}</Label>
                </View>
              </View>
              <Label size={24}>›</Label>
            </Pressable>
            {ready && !students.data?.length && (
              <Notice>
                Adicione seu primeiro aluno ou compartilhe seu link de cadastro.
              </Notice>
            )}
          </Card>
          <Card>
            <Label size={18} bold>
              Treinos
            </Label>
            <View style={styles.grid}>
              <Shortcut
                title="Prescrever treino"
                caption="Selecione um aluno"
                icon="≡"
                onPress={() => go("/alunos")}
              />
              <Shortcut
                title="Biblioteca de exercícios"
                caption="Exercícios e vídeos"
                icon="▷"
                onPress={() => go("/exercicios")}
              />
              <Shortcut
                title="Programas"
                caption="Organize suas rotinas"
                icon="▦"
                onPress={() => go("/programas")}
              />
              <Shortcut
                title="Treinos preparados"
                caption="Modelos para reutilizar"
                icon="≡"
                onPress={() => go("/treinos-preparados")}
              />
              <Shortcut
                title="Modelos de avaliação"
                caption="Questionários e versões"
                icon="✓"
                onPress={() => go("/modelos")}
              />
            </View>
          </Card>
        </View>
        <View style={{ flex: width >= 900 ? 1 : undefined, minWidth: 0 }}>
          {!!students.data?.length && (
            <Card>
              <Label size={18} bold>
                Acompanhamento
              </Label>
              {students.data.slice(0, 5).map((student) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir acompanhamento de ${student.name}`}
                  key={student.id}
                  onPress={() => go(`/alunos/${student.id}`)}
                  style={[
                    styles.studentRow,
                    { borderBottomWidth: 1, borderColor: t.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Label bold>{student.name}</Label>
                    <Label muted size={12}>
                      {student.mainGoal}
                    </Label>
                  </View>
                  <Label size={22}>›</Label>
                </Pressable>
              ))}
            </Card>
          )}
        </View>
      </View>
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
              onSaved={(student) => {
                setCreate(false);
                go(`/alunos/${student.id}`);
              }}
            />
          )}
        </Dialog>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  shortcut: {
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 112,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    minHeight: 64,
  },
});
