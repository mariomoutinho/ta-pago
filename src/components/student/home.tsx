import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import { useTheme } from "@/hooks/use-theme";
import { Focus } from "@/constants/focus";
import { Fonts } from "@/constants/theme";
import { Button, Label, Notice } from "@/components/personal/ui";
import { api, message } from "@/features/personal/api";
import { brazilToday } from "../../../shared/notifications";
import { calendarCells, shiftCalendarMonth, type StudentCalendar } from "../../../shared/student-calendar";

function useCalendar(month: string) {
  const [data, setData] = useState<StudentCalendar | null>(null), [error, setError] = useState("");
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setData(null); setError("");
    try { const value = await api<StudentCalendar>("/me/workout-calendar?month=" + month); if (current === version.current) setData(value); }
    catch (reason) { if (current === version.current) setError(message(reason)); }
  }, [month]);
  useFocusEffect(useCallback(() => { void reload(); return () => { version.current++; }; }, [reload]));
  return { data: data?.month === month ? data : null, error, retry: () => void reload() };
}

export function StudentHome() {
  const t = useTheme();
  const [today, setToday] = useState(brazilToday), [month, setMonth] = useState(() => brazilToday().slice(0, 7));
  const calendar = useCalendar(month);
  useEffect(() => { const timer = setInterval(() => setToday(brazilToday()), 60000); return () => clearInterval(timer); }, []);
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01T12:00:00Z")).replace(" de ", " ").replace(/^./, first => first.toUpperCase());
  const trained = new Map(calendar.data?.days.map(day => [day.date, day.count]));
  const cells = calendarCells(month);
  return <ScrollView style={{ backgroundColor: t.canvas }} contentContainerStyle={{ paddingHorizontal: Focus.padding, paddingTop: 8, paddingBottom: 32, flexGrow: 1 }}>
    <Text accessibilityRole="header" style={{ color: t.text, fontFamily: Fonts.sans, fontSize: 30, lineHeight: 36, fontWeight: "700" }}>Olá, atleta!</Text>
    <Pressable accessibilityRole="link" accessibilityLabel="Meus treinos" onPress={() => router.push("/treinos")} style={({ pressed }) => ({ marginTop: 42, height: 58, borderRadius: 14, backgroundColor: t.accent, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.75 : 1 })}>
      <Dumbbell size={22} color="#FFFFFF" strokeWidth={1.75} /><Text style={{ color: "#FFFFFF", fontFamily: Fonts.sans, fontSize: 17, fontWeight: "600", flex: 1 }}>Meus treinos</Text><ArrowRight size={22} color="#FFFFFF" strokeWidth={1.75} />
    </Pressable>
    <View testID="student-calendar" style={{ marginTop: 78, padding: 18, paddingBottom: 16, borderRadius: Focus.calendarRadius, borderWidth: 1, borderColor: t.border, backgroundColor: t.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: t.text, fontFamily: Fonts.sans, fontSize: 17, fontWeight: "600", flex: 1 }}>{title}</Text>
        {([-1, 1] as const).map(direction => <Pressable key={direction} accessibilityRole="button" accessibilityLabel={direction === -1 ? "Mês anterior" : "Próximo mês"} disabled={direction === -1 && month === "1000-01" || direction === 1 && month === "9999-12"} hitSlop={10} onPress={() => setMonth(value => shiftCalendarMonth(value, direction))} style={({ pressed }) => ({ width: 24, height: 22, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.5 : 1 })}>
          {direction === -1 ? <ChevronLeft size={20} strokeWidth={1.75} color={t.text} /> : <ChevronRight size={20} strokeWidth={1.75} color={t.text} />}
        </Pressable>)}
      </View>
      {calendar.error ? <View style={{ marginTop: 20, gap: 12 }}><Notice error>{calendar.error}</Notice><Button variant="secondary" onPress={calendar.retry}>Tentar carregar histórico</Button></View> : !calendar.data ? <View style={{ minHeight: 270, paddingTop: 24 }}><Label muted>Carregando histórico…</Label></View> : <>
        <View style={{ flexDirection: "row", marginTop: 16, marginBottom: 8 }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <Text key={index} style={{ flex: 1, textAlign: "center", fontFamily: Fonts.sans, color: t.textSecondary, fontSize: 11, lineHeight: 13 }}>{day}</Text>)}
        </View>
        <View style={{ gap: 5 }}>
          {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: "row", gap: 5 }}>
            {cells.slice(row * 7, row * 7 + 7).map((date, index) => {
              const count = date ? trained.get(date) ?? 0 : 0, future = !!date && date > today, isToday = date === today;
              const dateLabel = date ? date.slice(8) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4) : "";
              return <View key={date ?? index} accessible={!!date} accessibilityLabel={date ? `${dateLabel}${isToday ? ", Hoje" : ""}, ${count ? `${count} ${count === 1 ? "treino concluído" : "treinos concluídos"}` : future ? "Futuro" : "Sem registro"}` : undefined} style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: isToday ? t.accent : "transparent", backgroundColor: !date ? "transparent" : count ? t.accent : future ? t.backgroundElement : t.backgroundSelected, opacity: future && !count ? 0.4 : 1, justifyContent: "center", alignItems: "center" }}>
                {!!date && <Text style={{ color: count ? "#FFFFFF" : t.text, fontFamily: Fonts.sans, fontSize: 14, fontWeight: count ? "700" : "500" }}>{Number(date.slice(-2))}</Text>}
              </View>;
            })}
          </View>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 14 }}>
          {[{ label: "Treinou", color: t.accent }, { label: "Sem registro", color: t.backgroundSelected }, { label: "Futuro", color: t.backgroundElement }].map(item => <Legend key={item.label} {...item} />)}
        </View>
        <View style={{ marginTop: 6 }}><Legend label="Hoje" color="transparent" outline /></View>
      </>}
    </View>
    <View style={{ marginTop: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.backgroundElement, flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Text testID="student-month-total" accessibilityLiveRegion="polite" style={{ fontFamily: Fonts.sans, color: t.text, fontSize: 26, fontWeight: "700" }}>{calendar.data?.total ?? "—"}</Text><Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: t.textSecondary, flex: 1 }}>treinos concluídos neste mês</Text>
    </View>
  </ScrollView>;
}

function Legend({ label, color, outline = false }: { label: string; color: string; outline?: boolean }) {
  const t = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: outline ? 3 : 5, backgroundColor: color, borderWidth: outline ? 1 : 0, borderColor: t.accent }} /><Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: t.textSecondary }}>{label}</Text></View>;
}
