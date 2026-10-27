import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, useColorScheme as useSystemColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SecureStore from "expo-secure-store";

type ThemeMode = "light" | "dark";
type ThemePreference = { scheme: ThemeMode; toggleTheme: () => void };
const ThemePreferenceContext = createContext<ThemePreference | null>(null);
const storageKey = "tapago.theme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemeMode | null>(null);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  const scheme = preference ?? (system === "dark" ? "dark" : "light");
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const stored = Platform.OS === "web" ? window.localStorage.getItem(storageKey) : await SecureStore.getItemAsync(storageKey);
        if (active && !changed.current && (stored === "light" || stored === "dark")) setPreference(stored);
      } catch { /* Sem armazenamento, a alternância continua funcionando nesta sessão. */ }
    }
    void restore();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") document.documentElement.style.colorScheme = scheme;
  }, [scheme]);
  function toggleTheme() {
    const next = scheme === "dark" ? "light" : "dark";
    changed.current = true;
    setPreference(next);
    writes.current = writes.current.then(async () => {
      if (Platform.OS === "web") window.localStorage.setItem(storageKey, next);
      else await SecureStore.setItemAsync(storageKey, next);
    }).catch(() => {});
  }
  return <ThemePreferenceContext.Provider value={{ scheme, toggleTheme }}>
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
  </ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error("AppThemeProvider não disponível");
  return context;
}

export function useAppColorScheme(): ThemeMode {
  const context = useContext(ThemePreferenceContext);
  const system = useSystemColorScheme();
  return context?.scheme ?? (system === "dark" ? "dark" : "light");
}
