import {useEffect,useState} from 'react';
import {router,useLocalSearchParams,type Href} from 'expo-router';
import {useSession} from '@/features/personal/auth';
import {api,message} from '@/features/personal/api';
import {Button,Label,Notice} from '@/components/personal/ui';
import {Page} from '@/components/personal/shell';
import SignIn from './entrar';
import type {NewsItem} from '../../shared/notifications';

export default function OpenNotification(){
  const {user,loading}=useSession(),{aviso}=useLocalSearchParams<{aviso?:string}>();
  const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const returnTo=('/notificacao'+(aviso?'?aviso='+encodeURIComponent(aviso):'')) as Href;
  useEffect(()=>{
    if(loading||!user)return;let alive=true;setError('');
    if(user.role!=='personal'){router.replace('/');return;}
    void api<NewsItem[]>('/notifications/feed').then(async items=>{
      const item=items.find(item=>item.id===aviso)??items.find(item=>!item.read)??items[0];
      if(!alive)return;
      // Somente destinos retornados pelo feed do profissional autenticado.
      let destination=item?.url&&/^\/alunos\/(cadastros|[a-zA-Z0-9_-]+(?:\/treinos)?)$/.test(item.url)?item.url:'/?novidades=1';
      if(item?.kind==='enrollment'&&destination==='/alunos/cadastros')destination+='?cadastro='+encodeURIComponent(item.id);
      if(item&&!item.read)await api('/notifications/read','POST',{ids:[item.id]}).catch(()=>{});
      if(alive)router.replace(destination as Href);
    }).catch(error=>{if(alive)setError(message(error));});
    return()=>{alive=false;};
  },[loading,user,aviso,attempt]);
  if(!loading&&!user)return <SignIn afterLogin={returnTo}/>;
  return <Page><Label>Abrindo notificação…</Label><Notice error>{error}</Notice>{!!error&&<Button onPress={()=>setAttempt(value=>value+1)}>Tentar novamente</Button>}</Page>;
}
