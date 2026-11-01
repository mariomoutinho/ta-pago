import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { router, useGlobalSearchParams, type Href } from "expo-router";
import { api, message } from "@/features/personal/api";
import { useSession } from "@/features/personal/auth";
import { pushState, enablePush, clearNotificationsDevice, shouldOfferPush, rememberPushOffer, watchPushInstall, testPushNotification, testBackgroundNotification, type PushState } from "@/features/personal/push-device";
import { useTheme } from "@/hooks/use-theme";
import type { NewsItem } from "../../../shared/notifications";
import { Button, Dialog, Label, Notice, s } from "./ui";

export function EnrollmentNotifications(){
  const {user}=useSession(),t=useTheme();
  const params=useGlobalSearchParams<{novidades?:string}>();
  const [unread,setUnread]=useState(0),[open,setOpen]=useState(false),[offer,setOffer]=useState(false),[settings,setSettings]=useState(false);
  const [device,setDevice]=useState<PushState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [testResult,setTestResult]=useState('');
  const [items,setItems]=useState<NewsItem[]>([]),[loading,setLoading]=useState(false),[refreshKey,setRefreshKey]=useState(0);
  const refresh=useCallback(()=>setRefreshKey(value=>value+1),[]);
  const loadFeed=useCallback(async()=>{setLoading(true);try{const rows=await api<NewsItem[]>('/notifications/feed');setItems(rows);setUnread(rows.filter(row=>!row.read).length);setError("");}catch(error){setError(message(error));}finally{setLoading(false);}},[]);
  useEffect(()=>{
    let alive=true,inFlight=false,timer:ReturnType<typeof setTimeout>|undefined;
    const poll=async()=>{
      if(inFlight||(AppState.currentState&&AppState.currentState!=="active"))return;inFlight=true;
      try{const summary=await api<{unread:number}>('/notifications/summary');if(alive)setUnread(summary.unread??0);}catch{if(alive)setError("Não foi possível atualizar as novidades.");}
      finally{inFlight=false;if(alive)timer=setTimeout(()=>void poll(),15000);}
    };
    void poll();const listener=AppState.addEventListener('change',state=>{if(state==='active'){clearTimeout(timer);void poll();}});
    return()=>{alive=false;clearTimeout(timer);listener.remove();};
  },[refreshKey]);
  useEffect(()=>{if(open)void loadFeed();},[open,refreshKey,loadFeed]);
  useEffect(()=>{if(params.novidades==='1')setOpen(true);},[params.novidades]);
  useEffect(()=>{
    let alive=true;const check=()=>void pushState().then(state=>{
      if(!alive)return;setDevice(state);
      if(user&&state.supported&&!state.enabled&&!state.blocked&&shouldOfferPush(user.id)){rememberPushOffer(user.id);setOffer(true);}
    }).catch(()=>{if(alive)setError("Não foi possível verificar as notificações deste aparelho.");});check();const stop=watchPushInstall(()=>{check();refresh();});const listener=AppState.addEventListener('change',state=>{if(state==='active')check();});return()=>{alive=false;stop();listener.remove();};
  },[user,refresh]);
  async function togglePush(){setBusy(true);setError("");try{if(device?.enabled){await clearNotificationsDevice();setDevice(await pushState());}else setDevice(await enablePush());setOffer(false);}catch(error){setError(message(error));}finally{setBusy(false);}}
  async function markRead(ids:string[]){await api('/notifications/read','POST',{ids});setItems(current=>current.map(item=>ids.includes(item.id)?{...item,read:true}:item));refresh();}
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Novidades${unread?`, ${unread} não lidas`:""}`} onPress={()=>{setOffer(false);setOpen(true);}}
      style={({pressed})=>({minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:t.backgroundElement,opacity:pressed?0.7:1})}>
      <Label size={20}>🔔</Label>
      {unread>0&&<View testID="news-unread-dot" accessibilityLabel="Há novidades não lidas" style={{position:'absolute',top:5,right:5,width:11,height:11,borderRadius:6,backgroundColor:'#ef3340',borderWidth:1,borderColor:t.background}}/>}
    </Pressable>
    {offer&&!open&&<Dialog title="Receber notificações?" onClose={()=>setOffer(false)}>
      <Label>Saiba quando um aluno enviar um cadastro, concluir um treino ou deixar um feedback, mesmo com o Tá Pago fechado.</Label>
      <View style={{gap:10,marginTop:16}}>
        <Button disabled={busy} onPress={()=>void togglePush()}>{busy?"Ativando…":"Permitir notificações"}</Button>
        <Button disabled={busy} variant="secondary" onPress={()=>setOffer(false)}>Agora não</Button>
      </View><Notice error>{error}</Notice>
    </Dialog>}
    {open&&<Dialog title="Novidades" onClose={()=>setOpen(false)}>
      <View style={[s.row,{justifyContent:'space-between',marginBottom:12}]}>
        <Label muted>{unread?`${unread} não lida(s)`:'Tudo em dia'}</Label>
        <Button variant="secondary" disabled={busy||!items.some(item=>!item.read)} onPress={async()=>{setBusy(true);try{await markRead(items.filter(item=>!item.read).map(item=>item.id));}catch(error){setError(message(error));}finally{setBusy(false);}}}>Marcar todas como lidas</Button>
      </View>
      {loading&&<Notice>Carregando novidades…</Notice>}
      {!loading&&!items.length&&<Notice>Nenhuma novidade por enquanto.</Notice>}
      <View style={{gap:8}}>{items.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.read?'Lida':'Não lida'}: ${item.title}`} disabled={busy}
        style={({pressed})=>({padding:14,borderRadius:10,borderWidth:1,borderColor:t.border,backgroundColor:pressed||!item.read?t.accentSoft:t.background,gap:7})}
        onPress={async()=>{setBusy(true);setError("");try{if(!item.read)await markRead([item.id]);setOpen(false);router.push(item.url as Href);}catch(error){setError(message(error));}finally{setBusy(false);}}}>
        <View style={[s.row,{gap:8}]}><Label size={18}>{item.kind==='workout_completed'?'✓':item.kind==='feedback'?'✉':'+'}</Label><View style={{flex:1}}><Label bold={!item.read}>{item.title}</Label></View>{!item.read&&<View style={{width:8,height:8,borderRadius:4,backgroundColor:'#ef3340'}}/>}</View>
        <Label size={11} muted>{new Date(item.createdAt).toLocaleString('pt-BR')}</Label>
      </Pressable>)}</View>
      <Notice error>{error}</Notice>
      <View style={{gap:10,marginTop:16}}>
        <Button variant="secondary" onPress={refresh}>Atualizar novidades</Button>
        <Button variant="secondary" onPress={()=>{setSettings(value=>!value);void pushState().then(setDevice).catch(error=>setError(message(error)));}}>Notificações neste aparelho</Button>
      </View>
      {settings&&<View style={{gap:8,marginTop:12}}>
        <Notice>{device?.enabled?'Notificações ativadas neste aparelho.':'Ative os avisos para receber novidades com o aplicativo fechado. No iPhone, abra pelo ícone da tela inicial.'}</Notice>
        {device?.blocked&&<Notice>Libere a permissão nas configurações do navegador ou do celular.</Notice>}
        {device&&!device.supported&&<Notice>{device.nativeApp?'Instale a versão atualizada do APK para receber notificações nativas. As novidades continuam disponíveis no sino.':'Use o Tá Pago instalado pelo navegador em um aparelho compatível.'}</Notice>}
        <Button disabled={busy||!device?.supported} onPress={()=>void togglePush()}>{busy?'Aguarde…':device?.enabled?'Desativar neste aparelho':'Ativar notificações neste aparelho'}</Button>
        {device?.enabled&&<>
          <Button variant="secondary" disabled={busy} onPress={async()=>{setBusy(true);setError('');setTestResult('');try{await testPushNotification();setTestResult(device.nativeApp?'Teste solicitado ao Android. Confira as notificações do Tá Pago nas configurações do celular.':'Teste solicitado ao celular. Confira as notificações do Tá Pago e do navegador nas configurações do celular.');}catch(error){setError(message(error));}finally{setBusy(false);}}}>Testar alerta no celular</Button>
          <Notice>{testResult}</Notice>
          <Button variant="secondary" disabled={busy} onPress={async()=>{setBusy(true);setError('');setTestResult('');try{await testBackgroundNotification();setTestResult('Teste agendado. Feche o app agora e aguarde até 1 minuto e meio pelo alerta do Tá Pago.');}catch(error){setError(message(error));}finally{setBusy(false);}}}>Testar alerta com app fechado</Button>
          <Label size={12} muted>{device.nativeApp?'No Android, permita os avisos de “Novidades do Tá Pago” e confira se o modo Não perturbe está desligado.':'No Android, confira também se Tá Pago e o navegador podem mostrar notificações e se o modo Não perturbe está desligado.'}</Label>
        </>}
      </View>}
    </Dialog>}
  </>;
}
