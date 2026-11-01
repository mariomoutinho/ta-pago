import { api } from "./api";
export type PushState = { supported: boolean; enabled: boolean; blocked: boolean };
export function pushSupported() { return typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return { supported: false, enabled: false, blocked: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && Notification.permission === "granted") await api("/notifications/subscribe", "POST", { endpoint: subscription.endpoint });
  return { supported: true, enabled: !!subscription && Notification.permission === "granted", blocked: Notification.permission === "denied" };
}
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) throw new Error("Abra o Tá Pago instalado na tela inicial em um navegador compatível com notificações.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permita as notificações nas configurações do navegador ou do celular para receber os avisos.");
  const { publicKey } = await api<{ publicKey: string }>("/notifications/settings");
  const registration = await navigator.serviceWorker.register("/notifications-sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - publicKey.length % 4) % 4)), char => char.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  try { await api("/notifications/subscribe", "POST", { endpoint: subscription.endpoint }); }
  catch (error) { await subscription.unsubscribe(); throw error; }
  return { supported: true, enabled: true, blocked: false };
}
export async function clearNotificationsDevice() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try { await api("/notifications/unsubscribe", "POST", { endpoint: subscription.endpoint }); }
  finally { await subscription.unsubscribe(); }
}
