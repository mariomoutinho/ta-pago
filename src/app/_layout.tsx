import { useEffect } from "react";
import {
  Stack,
  usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AppThemeProvider } from "@/hooks/theme-preference";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/features/personal/auth";
import { PersonalShell } from "@/components/personal/shell";
import { Button, Notice, Label } from "@/components/personal/ui";
void SplashScreen.preventAutoHideAsync().catch(() => {});
function Navigation() {
  const { user, loading, error, refresh } = useSession();
  const pathname=usePathname();
  const publicForm = pathname.startsWith("/cadastro/") || pathname.startsWith('/grupo/') || pathname==='/ativar' || pathname==='/notificacao';
  useEffect(() => {
    if (!loading || publicForm) void SplashScreen.hideAsync();
  }, [loading, publicForm]);
  if (publicForm)
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="cadastro/[token]" />
        <Stack.Screen name="ativar" />
        <Stack.Screen name="notificacao" />
      </Stack>
    );
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
          <Stack.Screen name="grupos" />
        </Stack.Protected>
        <Stack.Protected guard={user?.role === "personal"}>
          <Stack.Screen name="alunos/index" />
          <Stack.Screen name="alunos/link" />
          <Stack.Screen name="alunos/cadastros" />
          <Stack.Screen name="alunos/[id]" />
          <Stack.Screen name="alunos/[id]/treinos" />
          <Stack.Screen name="programas" />
          <Stack.Screen name="exercicios" />
          <Stack.Screen name="treinos-preparados" />
          <Stack.Screen name="modelos" />
        </Stack.Protected>
        <Stack.Protected guard={user?.role === "student"}>
          <Stack.Screen name="acompanhamento/[id]" />
          <Stack.Screen name="treinos" />
        </Stack.Protected>
        <Stack.Screen name="cadastro/[token]" />
        <Stack.Screen name="ativar" />
        <Stack.Screen name="notificacao" />
        <Stack.Screen name="grupo/[code]" />
      </Stack>
    </PersonalShell>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <SessionProvider>
          <Navigation />
        </SessionProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
