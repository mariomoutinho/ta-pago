import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname, type Href } from "expo-router";
import Bell from "lucide-react-native/icons/bell";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import House from "lucide-react-native/icons/house";
import Moon from "lucide-react-native/icons/moon";
import Sun from "lucide-react-native/icons/sun";
import UserRound from "lucide-react-native/icons/user-round";
import { Focus, FocusColors } from "@/constants/focus";
import { Fonts } from "@/constants/theme";
import { ThemeOverrideContext, useTheme } from "@/hooks/use-theme";
import { useThemePreference } from "@/hooks/theme-preference";
import { Brand } from "@/components/personal/brand";
import { Button, Dialog, Label, Notice } from "@/components/personal/ui";
import { IconButton } from "@/components/studio/controls";
import { useResource } from "@/features/personal/use-resource";
import type { Plan } from "../../../shared/workouts";

const tabs = [{ href: "/", label: "Início", icon: House }, { href: "/treinos", label: "Treinos", icon: Dumbbell }, { href: "/perfil", label: "Perfil", icon: UserRound }];

export function StudentLayout({ children }: { children: ReactNode }) {
  const { scheme, toggleTheme } = useThemePreference();
  const t = FocusColors[scheme], path = usePathname();
  const [notifications, setNotifications] = useState(false);
  return <ThemeOverrideContext.Provider value={t}>
    <SafeAreaView style={{ flex: 1, backgroundColor: t.canvas }}>
      <View style={{ flex: 1, width: "100%", maxWidth: Focus.width, alignSelf: "center" }}>
        <View style={{ height: Focus.header, paddingHorizontal: Focus.padding, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Pressable accessibilityRole="link" accessibilityLabel="Ir para o início" onPress={() => router.push("/")}><Brand compact student /></Pressable>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton label={scheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} onPress={toggleTheme}>{scheme === "dark" ? <Sun size={20} color={t.textSecondary} /> : <Moon size={20} color={t.textSecondary} />}</IconButton>
            <IconButton label="Notificações" expanded={notifications} onPress={() => setNotifications(true)}><Bell size={22} strokeWidth={1.75} color={t.text} /></IconButton>
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        <View accessibilityRole="tablist" style={{ height: Focus.navigation, borderTopWidth: 1, borderColor: t.border, backgroundColor: t.background, flexDirection: "row" }}>
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : href === "/perfil" ? path === "/perfil" || path.startsWith("/acompanhamento") || path.startsWith("/grupos") : path.startsWith(href);
            return <Pressable key={href} accessibilityRole="tab" accessibilityLabel={label} aria-selected={active} accessibilityState={{ selected: active }} onPress={() => router.push(href as Href)} style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
              <Icon size={22} strokeWidth={1.75} color={active ? t.text : t.textSecondary} /><Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: active ? t.accent : t.textSecondary, fontWeight: active ? "600" : "400" }}>{label}</Text>
            </Pressable>;
          })}
        </View>
      </View>
      {notifications && <StudentNotifications close={() => setNotifications(false)} />}
    </SafeAreaView>
  </ThemeOverrideContext.Provider>;
}

function StudentNotifications({ close }: { close: () => void }) {
  const t = useTheme();
  const plans = useResource<Plan[]>("/me/workout-plans");
  return <Dialog title="Notificações" onClose={close}>
    <View style={{ gap: 16 }}>
      <Label muted>Publicações do seu professor</Label>
      <Notice error>{plans.error}</Notice>
      {plans.loading ? <Label>Carregando publicações…</Label> : plans.error ? <Button onPress={() => void plans.reload()}>Tentar novamente</Button> : !plans.data?.length ? <Label>Nenhum treino publicado por enquanto.</Label> : plans.data.map(plan => <Pressable key={plan.id} accessibilityRole="link" onPress={() => { close(); router.push("/treinos"); }} style={{ padding: 16, borderWidth: 1, borderRadius: 12, borderColor: t.border, gap: 4 }}>
        <Label bold>{plan.title}</Label><Label muted>{plan.publishedAt ? new Date(plan.publishedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Treino disponível"}</Label>
      </Pressable>)}
    </View>
  </Dialog>;
}
