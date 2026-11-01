export type PushState = { supported: boolean; enabled: boolean; blocked: boolean };
export const shouldOfferPush = (_userId:string) => false;
export function rememberPushOffer(_userId:string) {}
export const watchPushInstall = (_callback:()=>void) => () => {};
export const pushSupported = () => false;
export const pushState = async (): Promise<PushState> => ({ supported: false, enabled: false, blocked: false });
export async function enablePush(): Promise<PushState> { throw new Error("Ative as notificações pelo Tá Pago instalado a partir do navegador."); }
export async function clearNotificationsDevice() {}
