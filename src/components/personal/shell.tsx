import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { useThemePreference } from "@/hooks/theme-preference";
import { useSession } from "@/features/personal/auth";
import AppTabs from "@/components/app-tabs";
import { Button, Label, Notice, s } from "./ui";
import { message } from "@/features/personal/api";
import { router } from "expo-router";
import { EnrollmentNotifications } from "./enrollment-notifications";
import { Brand } from "./brand";
import { ProfessionalLayout } from "../studio/professional-layout";
import { Studio } from "@/constants/studio";
export { Brand } from "./brand";
export function PersonalShell({ children }: { children: ReactNode }) {
  const t = useTheme();
  const { scheme, toggleTheme } = useThemePreference();
  const { user, logout } = useSession();
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  if (!user)
    return (
      <View style={{ flex: 1, backgroundColor: t.backgroundElement }}>
        {children}
      </View>
    );
  if (user.role === "personal") return <ProfessionalLayout>{children}</ProfessionalLayout>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.backgroundElement }}>
      <View
        style={[
          styles.header,
          { backgroundColor: t.background, borderColor: t.border },
        ]}
      >
        <View style={[styles.headerInner, { gap: width < 700 ? 10 : 24 }]}>
          <View style={[s.row, width < 700 ? { width: "100%", justifyContent: "space-between" } : { flexShrink: 1 }]}>
            <Pressable accessibilityRole="link" accessibilityLabel="Ir para o início" onPress={() => router.push("/")} style={{ flexShrink: 1 }}>
              <Brand compact={width < 700} />
            </Pressable>
          </View>
          {width >= 900 && <AppTabs />}
          <View style={[s.row, { marginLeft: "auto" }]}>
            <View style={width < 700 ? { display: "none" } : undefined}>
              <Label size={12} bold>
                {user.name}
              </Label>
              <Label size={10} muted>
                Conta do aluno
              </Label>
            </View>
            <Button variant="secondary" label={scheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} onPress={toggleTheme}>
              {scheme === "dark" ? "☀" : "☾"}
            </Button>
            <Button
              variant="secondary"
              onPress={async () => {
                try {
                  await logout();
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              Sair
            </Button>
          </View>
        </View>
      </View>
      <Notice error>{error}</Notice>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
export function Page({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey?: string | number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey]);
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const professional = user?.role === "personal";
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.canvas ?? t.backgroundElement }}
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: width < 600 ? 20 : professional ? 48 : 32,
        paddingTop: professional && width >= 1000 ? 56 : width < 600 ? 24 : 32,
        paddingBottom: 60,
        width: "100%",
        maxWidth: professional ? Studio.contentWidth : 1240,
        alignSelf: "center",
        flexGrow: 1,
      }}
    >
      {children}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  header: { borderBottomWidth: 1 },
  headerInner: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
});
