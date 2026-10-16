import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/features/personal/auth";
import { PersonalShell } from "@/components/personal/shell";
import { Button, Notice, Label } from "@/components/personal/ui";
void SplashScreen.preventAutoHideAsync().catch(() => {});
function Navigation() {
  const { user, loading, error, refresh } = useSession();
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);
  if (loading) return <Label>Carregando Tá Pago…</Label>;
  if (error)
    return (
      <>
        <Notice error>{error}</Notice>
        <Button onPress={() => void refresh()}>Tentar novamente</Button>
      </>
    );
  return (
    <PersonalShell>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="entrar" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="explore" />
        </Stack.Protected>
        <Stack.Protected guard={user?.role === "personal"}>
          <Stack.Screen name="alunos/index" />
          <Stack.Screen name="alunos/[id]" />
          <Stack.Screen name="programas" />
          <Stack.Screen name="modelos" />
        </Stack.Protected>
        <Stack.Protected guard={user?.role === "student"}>
          <Stack.Screen name="acompanhamento/[id]" />
        </Stack.Protected>
      </Stack>
    </PersonalShell>
  );
}
export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <Navigation />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
