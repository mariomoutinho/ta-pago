import { api } from "./api";
import { androidPush, isAndroidApp, type AndroidPushState } from './android-push.web';
let androidEpoch=0;
export type PushState = { supported: boolean; enabled: boolean; blocked: boolean; nativeApp?:boolean };
const offered = new Set<string>();
function offerKey(userId:string){const installed=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;return 'tapago.push-offer.'+userId+(isAndroidApp()?'.android':installed?'.installed':'.browser');}
export function shouldOfferPush(userId:string){const key=offerKey(userId);try{return !localStorage.getItem(key);}catch{return !offered.has(key);}}
export function rememberPushOffer(userId:string){const key=offerKey(userId);offered.add(key);try{localStorage.setItem(key,'1');}catch{}}
export function watchPushInstall(callback:()=>void){window.addEventListener('appinstalled',callback);window.addEventListener('tapago-native-push',callback);return()=>{window.removeEventListener('appinstalled',callback);window.removeEventListener('tapago-native-push',callback);};}
async function registerAndroid(state:AndroidPushState,epoch:number):Promise<PushState>{
  if(epoch!==androidEpoch)throw new Error('As notificações foram desativadas neste aparelho.');
  if(!state.supported||!state.token)throw new Error('A configuração das notificações Android ainda está pendente.');
  const {binding}=await api<{binding:string}>('/notifications/android/subscribe','POST',{installation:state.installation,token:state.token});
  if(epoch!==androidEpoch)throw new Error('As notificações foram desativadas neste aparelho.');
  return androidPush('pushConfirm',{token:state.token,binding});
}
export function pushSupported() { return typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
export async function pushState(): Promise<PushState> {
  if(isAndroidApp()){
    const epoch=androidEpoch;
    // A versão 1.0.0 tem a ponte de arquivos, mas ainda não responde às ações push.
    if(/TaPagoAndroid\/1\.0\.0(?:\s|$)/.test(navigator.userAgent))return {supported:false,enabled:false,blocked:false,nativeApp:true};
    const state=await androidPush('pushState');
    return state.supported&&state.wanted&&state.permission?registerAndroid(state,epoch):state;
  }
  if (!pushSupported()) return { supported: false, enabled: false, blocked: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) void registration.update().catch(() => {});
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && Notification.permission === "granted") await api("/notifications/subscribe", "POST", { endpoint: subscription.endpoint });
  return { supported: true, enabled: !!subscription && Notification.permission === "granted", blocked: Notification.permission === "denied" };
}
export async function enablePush(): Promise<PushState> {
  if(isAndroidApp()){const epoch=androidEpoch;return registerAndroid(await androidPush('pushEnable'),epoch);}
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
  if(isAndroidApp()){
    androidEpoch++;
    if(/TaPagoAndroid\/1\.0\.0(?:\s|$)/.test(navigator.userAgent))return;
    const old=await androidPush('pushDisable');
    if(old.token)await api('/notifications/android/unsubscribe','POST',{installation:old.installation});
    return;
  }
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
  if(isAndroidApp()){await androidPush('pushTest');return;}
  const registration=await navigator.serviceWorker.ready;
  await registration.showNotification('Teste do Tá Pago',{
    body:'As notificações do Tá Pago podem aparecer neste aparelho.',
    icon:'/assets/pwa/icon-192.png',tag:'tapago-device-test',data:{url:'/notificacao'},
  });
}
export async function testBackgroundNotification(){
  const state=await pushState();if(!state.enabled)throw new Error('Ative as notificações neste aparelho antes de testar.');
  if(isAndroidApp()){const native=await androidPush('pushState');await api('/notifications/android/test','POST',{installation:native.installation});return;}
  const subscription=await(await navigator.serviceWorker.ready).pushManager.getSubscription();
  if(!subscription)throw new Error('Ative as notificações novamente antes de testar.');
  await api('/notifications/test','POST',{endpoint:subscription.endpoint});
}
