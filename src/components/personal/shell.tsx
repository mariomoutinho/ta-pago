import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Image,
  ScrollView,
  View,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/personal/auth";
import AppTabs from "@/components/app-tabs";
import { Button, Label, Notice, s } from "./ui";
import { message } from "@/features/personal/api";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={s.row}>
      <View
        style={{
          width: compact ? 36 : 48,
          height: compact ? 36 : 48,
          backgroundColor: "#000",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Image
          source={require("../../../logotapago.png")}
          accessibilityLabel="Logo Tá Pago"
          style={{ width: compact ? 36 : 48, height: compact ? 36 : 48 }}
          resizeMode="contain"
        />
      </View>
      <View>
        <Label size={compact ? 18 : 21} bold>
          TÁ PAGO<Label size={10}> PERSONAL</Label>
        </Label>
        {!compact && (
          <Label size={11} muted>
            Presença. Evolução. Resultado.
          </Label>
        )}
      </View>
    </View>
  );
}
export function PersonalShell({ children }: { children: ReactNode }) {
  const t = useTheme();
  const { user, logout } = useSession();
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  if (!user)
    return (
      <View style={{ flex: 1, backgroundColor: t.backgroundElement }}>
        {children}
      </View>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.backgroundElement }}>
      <View
        style={[
          styles.header,
          { backgroundColor: t.background, borderColor: t.border },
        ]}
      >
        <View style={[styles.headerInner, { gap: width < 700 ? 10 : 24 }]}>
          <Brand compact={width < 700} />
          {width >= 900 && <AppTabs />}
          <View style={[s.row, { marginLeft: "auto" }]}>
            <View style={width < 700 ? { display: "none" } : undefined}>
              <Label size={12} bold>
                {user.name}
              </Label>
              <Label size={10} muted>
                {user.role === "personal"
                  ? "Conta profissional"
                  : "Conta do aluno"}
              </Label>
            </View>
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
          {width < 900 && (
            <View style={{ width: "100%" }}>
              <AppTabs />
            </View>
          )}
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
  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: width < 600 ? 18 : 32,
        paddingBottom: 60,
        width: "100%",
        maxWidth: 1240,
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
