import { api } from "./api";
export type PushState = { supported: boolean; enabled: boolean; blocked: boolean };
const offered = new Set<string>();
function offerKey(userId:string){const installed=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;return 'tapago.push-offer.'+userId+(installed?'.installed':'.browser');}
export function shouldOfferPush(userId:string){const key=offerKey(userId);try{return !localStorage.getItem(key);}catch{return !offered.has(key);}}
export function rememberPushOffer(userId:string){const key=offerKey(userId);offered.add(key);try{localStorage.setItem(key,'1');}catch{}}
export function watchPushInstall(callback:()=>void){window.addEventListener('appinstalled',callback);return()=>window.removeEventListener('appinstalled',callback);}
export function pushSupported() { return typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return { supported: false, enabled: false, blocked: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) void registration.update().catch(() => {});
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
export async function testPushNotification(){
  const state=await pushState();
  if(!state.enabled)throw new Error('Ative as notificações neste aparelho antes de testar.');
  const registration=await navigator.serviceWorker.ready;
  await registration.showNotification('Teste do Tá Pago',{
    body:'As notificações do Tá Pago podem aparecer neste aparelho.',
    icon:'/assets/pwa/icon-192.png',tag:'tapago-device-test',data:{url:'/notificacao'},
  });
}
export async function testBackgroundNotification(){
  const state=await pushState();if(!state.enabled)throw new Error('Ative as notificações neste aparelho antes de testar.');
  const subscription=await(await navigator.serviceWorker.ready).pushManager.getSubscription();
  if(!subscription)throw new Error('Ative as notificações novamente antes de testar.');
  await api('/notifications/test','POST',{endpoint:subscription.endpoint});
}
