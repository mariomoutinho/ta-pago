import { Pressable, Text, View } from "react-native";
import type { Student } from "@/features/personal/types";
import { formatDate, today } from "@/features/personal/api";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { Button, Card, Label } from "./ui";

type Navigation = { onNavigate: (tab: string) => void };

export function ProfileHeader({ student, studentView, tab, onNavigate, onBack }: Navigation & {
  student: Student; studentView: boolean; tab: string; onBack: () => void;
}) {
  const t = useTheme();
  return <View style={{ gap: 14, marginBottom: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={tab === "Treinos" ? "Início do aluno" : "Voltar aos alunos"} onPress={tab === "Treinos" ? () => onNavigate("Início") : onBack} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
      <Label size={13}>‹ {tab === "Treinos" ? "Voltar" : studentView ? "Meus acompanhamentos" : "Todos os alunos"}</Label>
    </Pressable>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Label bold>{student.name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join("")}</Label>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text accessibilityRole="header" style={{ fontFamily: Fonts.sans, fontSize: 18, fontWeight: "700", color: t.text }}>{student.name}</Text>
        <Label size={12} muted>{student.linkStatus === "ended" ? "Vínculo encerrado" : student.accountId ? "Conta vinculada" : "Acompanhamento do personal"}</Label>
      </View>
    </View>
    {tab !== "Treinos" && <View style={{ flexDirection: "row", gap: 6 }}>
      {["Início", "Opções"].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value} aria-selected={tab === value} onPress={() => onNavigate(value)}
        style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tab === value ? t.accentSoft : t.backgroundElement, borderBottomWidth: 3, borderBottomColor: tab === value ? t.accent : "transparent" }}>
        <Label size={13} bold>{value}</Label>
      </Pressable>)}
    </View>}
    {!["Início", "Opções", "Treinos"].includes(tab) && <View style={{ gap: 8 }}>
      <Button variant="secondary" onPress={() => onNavigate("Início")}>‹ Início do aluno</Button>
      {tab !== "Treinos" && <Label bold size={18}>{tab}</Label>}
    </View>}
  </View>;
}

function MenuRow({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: t.border, opacity: pressed ? 0.65 : 1 })}>
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Label>{icon}</Label></View>
    <View style={{ flex: 1 }}><Label size={13}>{label}</Label></View><Label muted>›</Label>
  </Pressable>;
}

export function ProfileMenu({ tabs, onNavigate, onEdit }: Navigation & { tabs: string[]; onEdit?: () => void }) {
  return <Card style={{ padding: 14, borderRadius: 8 }}>
    {onEdit && <MenuRow label="Editar cadastro" icon="✎" onPress={onEdit} />}
    {tabs.map(tab => <MenuRow key={tab} label={tab === "Visão geral" ? "Dados do aluno e vínculo" : tab} icon="›" onPress={() => onNavigate(tab)} />)}
  </Card>;
}

export function ProfileHome({ student, studentView, onNavigate, onAddNote }: Navigation & {
  student: Student; studentView: boolean; onAddNote: () => void;
}) {
  const t = useTheme();
  const now = today();
  const current = new Date(`${now}T00:00:00Z`);
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - (current.getUTCDay() + 6) % 7);
  const training = student.records.filter(r => r.kind === "training");
  const completed = training.filter(r => r.data.status === "realizado" && r.date <= now).sort((a, b) => b.date.localeCompare(a.date));
  const last = completed[0];
  const cutoff = new Date(current); cutoff.setUTCDate(cutoff.getUTCDate() - 27);
  const average = completed.filter(r => r.date >= cutoff.toISOString().slice(0, 10)).length / 4;
  const notes = student.records.filter(r => r.kind === "note").sort((a, b) => b.date.localeCompare(a.date));
  const card = { padding: 14, borderRadius: 8, marginBottom: 12, backgroundColor: t.backgroundElement, borderWidth: 0 };
  return <View>
    <Card style={card}>
      <View style={{ flexDirection: "row" }}>
        {[["Treinos", "↔", "Treinos"], ["Progresso", "↗", "Evolução física"], ["Avaliações", "▤", "Avaliações"]].map(([label, icon, target]) =>
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => onNavigate(target)} style={{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 8 }}>
            <View style={{ backgroundColor: t.accentSoft, borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Label size={22}>{icon}</Label></View>
            <Label size={12}>{label}</Label>
          </Pressable>)}
      </View>
    </Card>
    <Card style={card}>
      <Label size={13} bold>Frequência de treinos</Label>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 12 }}>
        {["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => {
          const date = new Date(monday); date.setUTCDate(monday.getUTCDate() + index);
          const key = date.toISOString().slice(0, 10);
          const entries = training.filter(r => r.date === key);
          const status = entries.some(r => r.data.status === "realizado") ? "Realizado" : entries.some(r => r.data.status === "ausente") ? "Ausência registrada" : entries.length ? "Previsto" : "Sem registro";
          return <View key={key} accessible accessibilityLabel={`${formatDate(key)}: ${status}`} style={{ alignItems: "center", gap: 5 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: key === now ? 2 : 1, borderColor: status === "Realizado" ? t.success : t.accent, alignItems: "center", justifyContent: "center" }}><Label size={13}>{status === "Realizado" ? "✓" : status === "Ausência registrada" ? "×" : status === "Previsto" ? "·" : ""}</Label></View>
            <Label size={11} bold>{label}</Label>
          </View>;
        })}
      </View>
      <Label size={11} muted>{student.weeklyFrequency}× por semana planejados · ✓ realizado · × ausência · · previsto</Label>
    </Card>
    <Card style={card}>
      <Label size={13} bold>Engajamento do aluno</Label>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
        <View style={{ flex: 1, gap: 4 }}><Label size={12} muted>Último treino registrado</Label><Label size={13} bold>{last ? formatDate(last.date) : "Sem registros"}</Label></View>
        <View style={{ flex: 1, gap: 4 }}><Label size={12} muted>Média nos últimos 28 dias</Label><Label size={13} bold>{average.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / semana</Label></View>
      </View>
    </Card>
    <Card style={card}>
      <MenuRow label="Progresso do aluno" icon="↗" onPress={() => onNavigate("Evolução física")} />
      <MenuRow label="Registros de treino" icon="▤" onPress={() => onNavigate("Treinamentos")} />
      <MenuRow label="Histórico e observações" icon="≡" onPress={() => onNavigate("Histórico e observações")} />
    </Card>
    <Card style={card}>
      <Label size={13} bold>Anotações</Label>
      <View style={{ marginVertical: 12, gap: 6 }}>
        <Label size={13}>{notes[0] ? String(notes[0].data.notes ?? "") : "Nenhuma anotação registrada."}</Label>
        {notes[0] && <Label size={11} muted>{formatDate(notes[0].date)}</Label>}
      </View>
      {!studentView && <Button variant="secondary" onPress={onAddNote}>Adicionar anotação</Button>}
    </Card>
  </View>;
}
