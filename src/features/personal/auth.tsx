import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, message } from "./api";
import { saveSession } from "./session-storage";
import type { User } from "./types";
type Auth = {
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  authenticate: (action: "login" | "register", data: unknown) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await api<{ user: User | null }>("/auth/status");
      setUser(result.user);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function authenticate(action: "login" | "register", data: unknown) {
    const result = await api<{ user: User; token?: string }>(
      `/auth/${action}`,
      "POST",
      data,
    );
    if (result.token) await saveSession(result.token);
    setUser(result.user);
    setError("");
  }
  async function logout() {
    await api("/auth/logout", "POST");
    await saveSession(null);
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, loading, error, refresh, authenticate, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider não disponível");
  return context;
}
