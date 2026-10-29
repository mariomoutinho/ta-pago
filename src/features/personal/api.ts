import { Platform } from "react-native";
import { readSession } from "./session-storage";
export function apiBase() {
  const configured = process.env.EXPO_PUBLIC_PERSONAL_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return "http://127.0.0.1:3003";
    return window.location.port === "8081"
      ? `${window.location.protocol}//${window.location.hostname}:3003`
      : window.location.origin;
  }
  throw new Error(
    "Configure EXPO_PUBLIC_PERSONAL_API_URL com o endereço da API acessível pelo dispositivo.",
  );
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const token = Platform.OS === "web" ? null : await readSession();
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api${url}`, {
      method,
      credentials: Platform.OS === "web" ? "include" : "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "TaPago",
        "X-Client-Platform": Platform.OS === "web" ? "web" : "native",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (error) {
    throw new Error(
      `Não foi possível acessar o servidor. Confira sua conexão e tente novamente. ${error instanceof Error ? error.message : ""}`,
    );
  }
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error ?? "Não foi possível concluir a operação",
      response.status,
    );
  return body as T;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatDate(value?: string | null) {
  return value
    ? new Date(
        value.length === 10 ? `${value}T12:00:00` : value,
      ).toLocaleDateString("pt-BR")
    : "A definir";
}
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação";
export async function exportStudent(id: string, isStudent = false) {
  const data = await api(
    `/` + (isStudent ? "me/students" : "students") + `/${id}/export`,
  );
  const text = JSON.stringify(data, null, 2);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `tapago-${id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { Share } = await import("react-native");
    await Share.share({
      title: "Exportação do meu acompanhamento Tá Pago",
      message: text,
    });
  }
}
