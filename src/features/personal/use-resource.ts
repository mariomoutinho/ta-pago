import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, message } from "./api";
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  return { data, error, loading, reload };
}
