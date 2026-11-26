import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname, type Href } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import House from "lucide-react-native/icons/house";
import Users from "lucide-react-native/icons/users";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import Library from "lucide-react-native/icons/library";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import Trophy from "lucide-react-native/icons/trophy";
import LogOut from "lucide-react-native/icons/log-out";
import PanelLeftClose from "lucide-react-native/icons/panel-left-close";
import PanelLeftOpen from "lucide-react-native/icons/panel-left-open";
import Menu from "lucide-react-native/icons/menu";
import X from "lucide-react-native/icons/x";
import Moon from "lucide-react-native/icons/moon";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Studio, StudioColors } from "@/constants/studio";
import { Fonts } from "@/constants/theme";
import { ThemeOverrideContext, useTheme } from "@/hooks/use-theme";
import { useThemePreference } from "@/hooks/theme-preference";
import { useSession } from "@/features/personal/auth";
import { message } from "@/features/personal/api";
import { Brand } from "../personal/brand";
import { Label, Notice } from "../personal/ui";
import { EnrollmentNotifications } from "../personal/enrollment-notifications";
import { IconButton, studioWebProps } from "./controls";
import { StudioIcon } from "./icons";

const routes: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Início", icon: House }, { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/programas", label: "Programas", icon: CalendarDays }, { href: "/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/treinos-preparados", label: "Catálogo de treinos", icon: Library }, { href: "/modelos", label: "Avaliações", icon: ClipboardList },
  { href: "/grupos", label: "Grupos e desafios", icon: Trophy },
  { href: "/presets", label: "Presets", icon: SlidersHorizontal },
];
const isActive = (path: string, href: string) => href === "/" ? path === "/" : path === href || path.startsWith(href + "/");

function SidebarItem({ item, collapsed, active, navigate }: { item: typeof routes[number]; collapsed: boolean; active: boolean; navigate: () => void }) {
  const t = useTheme();
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const Icon = item.icon;
  return <View style={{ position: "relative", zIndex: hovered || focused ? 20 : 1 }}>
    <Pressable {...studioWebProps} {...(Platform.OS === "web" ? { title: collapsed ? item.label : undefined } : {})}
      {...(Platform.OS === "web" ? { "aria-current": active ? "page" : undefined } : {})}
      accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected: active }} accessibilityHint={collapsed ? item.label : undefined}
      onPress={navigate} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => ({ minHeight: 44, borderRadius: 9, paddingHorizontal: collapsed ? 12 : 14, flexDirection: "row", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 12, backgroundColor: active ? t.accentSoft : hovered || pressed ? t.backgroundElement : "transparent", borderWidth: 1, borderColor: focused ? t.accent : "transparent" })}>
      {active && <View style={{ position: "absolute", left: -1, top: 7, bottom: 7, width: 3, borderRadius: 2, backgroundColor: t.accent }} />}
      <Icon size={20} strokeWidth={Studio.strokeWidth} color={active ? t.accent : t.textSecondary} />
      {!collapsed && <Text numberOfLines={1} style={{ color: active ? t.accent : t.textSecondary, fontFamily: Fonts.sans, fontSize: 13, fontWeight: active ? "600" : "400" }}>{item.label}</Text>}
    </Pressable>
    {collapsed && (hovered || focused) && <View pointerEvents="none" style={{ position: "absolute", left: 64, top: 3, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.background, borderRadius: 8, minWidth: 160, boxShadow: "0 8px 24px #00000020" }}><Label size={12}>{item.label}</Label></View>}
  </View>;
}

function Sidebar({ collapsed, drawer, close, toggle, logout, pending }: { collapsed: boolean; drawer?: boolean; close: () => void; toggle: () => void; logout: () => void; pending: boolean }) {
  const t = useTheme(), path = usePathname(), { user } = useSession();
  return <View {...(Platform.OS === "web" ? { dataSet: { studioSidebar: t.canvas === StudioColors.dark.canvas ? "dark" : "light" } } : {})} testID="professional-sidebar" style={{ width: drawer ? "100%" : collapsed ? Studio.collapsedSidebar : Studio.sidebar, flex: 1, backgroundColor: t.sidebar, borderRightWidth: 1, borderColor: t.border, paddingHorizontal: collapsed ? 12 : 16, paddingTop: 24, paddingBottom: 20 }}>
    <View style={{ height: 64, paddingHorizontal: collapsed ? 8 : 8, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
      <Pressable accessibilityRole="link" accessibilityLabel="Ir para o início" onPress={() => { router.push("/"); close(); }}><Brand compact studio iconOnly={collapsed} /></Pressable>
      {drawer && <IconButton label="Fechar menu" onPress={close}><X size={18} color={t.textSecondary} strokeWidth={Studio.strokeWidth} /></IconButton>}
    </View>
    <ScrollView style={{ flex: 1, overflow: "visible" }} contentContainerStyle={{ paddingTop: 18, gap: 8 }} showsVerticalScrollIndicator={false}>
      {!collapsed && <View style={{ paddingHorizontal: 12, marginBottom: 8 }}><Text style={{ fontFamily: Fonts.sans, color: t.subtle, fontSize: 10, fontWeight: "600", letterSpacing: 1.4 }}>ÁREA PROFISSIONAL</Text></View>}
      {routes.map(item => <SidebarItem key={item.href} item={item} collapsed={collapsed} active={isActive(path, item.href)} navigate={() => { router.push(item.href as Href); close(); }} />)}
    </ScrollView>
    <View style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 20, paddingHorizontal: collapsed ? 4 : 12, gap: 14 }}>
      {!collapsed && <View style={{ gap: 6 }}><Text style={{ fontFamily: Fonts.sans, color: t.subtle, fontSize: 9, fontWeight: "600", letterSpacing: 1 }}>CONTA PROFISSIONAL</Text><Text numberOfLines={2} style={{ color: t.text, fontFamily: Fonts.sans, fontSize: 14, fontWeight: "600" }}>{user?.name}</Text></View>}
      <View style={{ flexDirection: collapsed ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Pressable {...studioWebProps} accessibilityRole="button" accessibilityLabel="Sair" disabled={pending} onPress={logout}
          style={({ pressed }) => ({ minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", gap: 10, opacity: pending || pressed ? 0.5 : 1 })}>
          <LogOut size={18} strokeWidth={Studio.strokeWidth} color={t.textSecondary} />{!collapsed && <Label size={13} muted>{pending ? "Saindo…" : "Sair"}</Label>}
        </Pressable>
        {!drawer && <IconButton label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} expanded={!collapsed} onPress={toggle}>
          {collapsed ? <PanelLeftOpen size={18} color={t.textSecondary} /> : <PanelLeftClose size={18} color={t.textSecondary} />}
        </IconButton>}
      </View>
    </View>
  </View>;
}

function StudioFrame({ children }: { children: ReactNode }) {
  const t = useTheme(), { user, logout } = useSession(), { scheme, toggleTheme } = useThemePreference();
  const path = usePathname(), { width } = useWindowDimensions(), mobile = width < Studio.breakpoint;
  const [collapsed, setCollapsed] = useState(false), [drawer, setDrawer] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (Platform.OS === "web") { try { setCollapsed(window.localStorage.getItem("tapago.studio.sidebar") === "collapsed"); } catch {} } }, []);
  useEffect(() => { setDrawer(false); }, [path, mobile]);
  function toggle() { setCollapsed(value => { const next = !value; if (Platform.OS === "web") { try { window.localStorage.setItem("tapago.studio.sidebar", next ? "collapsed" : "expanded"); } catch {} } return next; }); }
  async function exit() { setPending(true); setError(""); try { await logout(); } catch (e) { setError(message(e)); } finally { setPending(false); } }
  const current = routes.find(item => isActive(path, item.href))?.label ?? "Área profissional";
  return <SafeAreaView style={{ flex: 1, backgroundColor: t.canvas }}>
    <View style={{ flex: 1, flexDirection: "row" }}>
      {!mobile && <View style={{ width: collapsed ? Studio.collapsedSidebar : Studio.sidebar, zIndex: 20 }}><Sidebar collapsed={collapsed} close={() => {}} toggle={toggle} logout={() => void exit()} pending={pending} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ height: mobile ? 72 : Studio.header, paddingHorizontal: mobile ? 20 : 48, backgroundColor: t.canvas, borderBottomWidth: 1, borderColor: t.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            {mobile && <IconButton label="Abrir menu" expanded={drawer} onPress={() => setDrawer(true)}><Menu size={20} color={t.textSecondary} strokeWidth={Studio.strokeWidth} /></IconButton>}
            {mobile ? <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontFamily: Fonts.sans, fontSize: 13, fontWeight: "600", color: t.text }}>{current}</Text></View> : <View accessibilityLabel={`Área profissional / ${current}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Label size={12} muted>Área profissional</Label><ChevronRight size={13} color={t.subtle} /><Label size={12} muted>{current}</Label></View>}
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {!mobile && <View style={{ marginRight: 10, maxWidth: 200 }}><Text numberOfLines={1} style={{ fontFamily: Fonts.sans, color: t.text, fontSize: 12, fontWeight: "600" }}>{user?.name}</Text><Label size={10} muted>Personal</Label></View>}
            <IconButton label={scheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} onPress={toggleTheme}>{scheme === "dark" ? <StudioIcon name="sun" /> : <Moon size={20} color={t.textSecondary} strokeWidth={Studio.strokeWidth} />}</IconButton>
            <EnrollmentNotifications key={user?.id} studio />
          </View>
        </View>
        <Notice error>{error}</Notice>
        <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      </View>
    </View>
    {mobile && drawer && <Modal transparent animationType="none" visible onRequestClose={() => setDrawer(false)}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#00000099" }}>
        <SafeAreaView accessibilityViewIsModal style={{ width: Math.min(300, width - 48), backgroundColor: t.sidebar }}><Sidebar collapsed={false} drawer close={() => setDrawer(false)} toggle={toggle} logout={() => void exit()} pending={pending} /></SafeAreaView>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu lateral" onPress={() => setDrawer(false)} style={{ flex: 1 }} />
      </View>
    </Modal>}
  </SafeAreaView>;
}

export function ProfessionalLayout({ children }: { children: ReactNode }) {
  const { scheme } = useThemePreference();
  return <ThemeOverrideContext.Provider value={StudioColors[scheme]}><StudioFrame>{children}</StudioFrame></ThemeOverrideContext.Provider>;
}
