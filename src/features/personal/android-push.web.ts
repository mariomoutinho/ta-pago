/** Ponte restrita à origem do aplicativo; tokens nunca vão para URLs ou logs. */
export type AndroidPushState = {supported:boolean;enabled:boolean;blocked:boolean;nativeApp:true;wanted:boolean;permission:boolean;installation:string;token:string};
type Bridge = {postMessage:(value:string)=>void;onmessage?:((event:MessageEvent<string>)=>void)|null};
const pending=new Map<string,{resolve:(value:AndroidPushState)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
let bridge:Bridge|undefined;
export const isAndroidApp=()=>typeof navigator!=='undefined'&&/TaPagoAndroid\//.test(navigator.userAgent);
export function androidPush(action:string,data:Record<string,unknown>={}):Promise<AndroidPushState>{
  const current=(window as Window&{TaPagoAndroid?:Bridge}).TaPagoAndroid;
  if(!current)return Promise.reject(new Error('Atualize o APK do Tá Pago para usar as notificações nativas.'));
  if(current!==bridge){bridge=current;current.onmessage=event=>{
    try{const response=JSON.parse(event.data),request=pending.get(response.id);if(!request)return;clearTimeout(request.timer);pending.delete(response.id);if(response.error)request.reject(new Error(response.error));else request.resolve(response.result);}catch{/* Mensagens de outras ações não alteram as solicitações. */}
  };}
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error('O Android não respondeu. Reabra o aplicativo e tente novamente.'));},30000);
    pending.set(id,{resolve,reject,timer});
    try{current.postMessage(JSON.stringify({action,id,...data}));}catch{clearTimeout(timer);pending.delete(id);reject(new Error('Não foi possível comunicar com o Android.'));}
  });
}
