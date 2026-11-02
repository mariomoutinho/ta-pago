import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Page } from '@/components/personal/shell';
import { Button, Card, Heading, Label, Notice } from '@/components/personal/ui';
import { useSession } from '@/features/personal/auth';
import { useResource } from '@/features/personal/use-resource';
import { api,message } from '@/features/personal/api';
import type { FitnessGroupSummary } from '../../../shared/groups';
import SignIn from '../entrar';
export default function GroupInvitePage(){
  const {code}=useLocalSearchParams<{code:string}>(),{user}=useSession();
  const resource=useResource<(FitnessGroupSummary&{joined:boolean})>(user?`/fitness-groups/invite/${code}`:null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!user)return <><Notice>Entre na sua conta de aluno para conferir o convite do grupo.</Notice><SignIn afterLogin={`/grupo/${code}` as Href}/></>;
  return <Page><Heading title="Convite para grupo"/>
    <Notice error>{error||resource.error}</Notice>
    {resource.data&&<Card><Label size={22} bold>{resource.data.name}</Label><Label>{resource.data.description}</Label><Label muted>Personal: {resource.data.ownerName}</Label>
      <Label>Ao aceitar, seu nome e a quantidade de treinos concluídos durante os desafios ficarão visíveis aos participantes. Fotos e comentários só são compartilhados quando você escolher este grupo no envio. Você pode sair quando quiser.</Label>
      <Button disabled={busy||user.role!=='student'} onPress={async()=>{setBusy(true);setError('');try{const result=await api<{id:string}>(`/fitness-groups/invite/${code}`,'POST',{});router.replace(`/grupos?id=${encodeURIComponent(result.id)}` as Href);}catch(e){setError(message(e));}finally{setBusy(false);}}}>{resource.data.joined?'Abrir meu grupo':'Aceitar e participar do grupo'}</Button>
    </Card>}
    <Button variant="secondary" onPress={()=>router.replace('/')}>Voltar ao início</Button>
  </Page>;
}
