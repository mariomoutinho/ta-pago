import { useState } from 'react';
import { Image, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Page } from '@/components/personal/shell';
import { Button, Card, Confirm, Field, Heading, Label, Notice } from '@/components/personal/ui';
import { useSession } from '@/features/personal/auth';
import { useResource } from '@/features/personal/use-resource';
import { api, formatDate, message, today } from '@/features/personal/api';
import { dateInputToIso, datePlaceholder, formatDateInput } from '@/features/personal/input-format';
import type { FitnessGroupDetails,FitnessGroupSummary } from '../../shared/groups';
import { fitnessChallengeSchema,fitnessGroupSchema } from '../../shared/groups';
export default function GroupsPage(){
  const params=useLocalSearchParams<{id?:string}>(),{user}=useSession(),personal=user?.role==='personal';
  const [selected,setSelected]=useState<string|null>(params.id??null),[creating,setCreating]=useState(false),[challenge,setChallenge]=useState(false),[leave,setLeave]=useState(false);
  const [name,setName]=useState(''),[description,setDescription]=useState(''),[title,setTitle]=useState(''),[starts,setStarts]=useState(formatDateInput(today())),[ends,setEnds]=useState(''),[goal,setGoal]=useState('12'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const groups=useResource<FitnessGroupSummary[]>('/fitness-groups'),detail=useResource<FitnessGroupDetails>(selected?`/fitness-groups/${selected}`:null);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setSuccess('');try{await action();}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <Page resetKey={selected??'groups'}>
    <Heading title="Grupos e desafios" subtitle="Participe por escolha. Compartilhe cada conquista com seu grupo."/>
    <Notice error>{error||groups.error||detail.error}</Notice><Notice>{success}</Notice>
    {selected?<>
      <Button variant="secondary" onPress={()=>{setSelected(null);setChallenge(false);}}>Voltar aos grupos</Button>
      {detail.data&&<>
        <Card><Label size={22} bold>{detail.data.name}</Label><Label>{detail.data.description}</Label><Label muted>{detail.data.members} participante(s) · {detail.data.ownerName}</Label>
          {personal&&detail.data.inviteUrl&&<Button variant="secondary" onPress={()=>void run(async()=>{await Clipboard.setStringAsync(detail.data!.inviteUrl!);setSuccess('Link do grupo copiado. O aluno precisa aceitar o convite.');})}>Copiar convite do grupo</Button>}
          {!personal&&<Button variant="secondary" onPress={()=>setLeave(true)}>Sair do grupo</Button>}
        </Card>
        {personal&&<Button onPress={()=>setChallenge(!challenge)}>Criar desafio</Button>}
        {challenge&&<Card><Field label="Nome do desafio" value={title} onChangeText={setTitle}/>
          <Field label="Início do desafio" placeholder={datePlaceholder} value={starts} onChangeText={v=>setStarts(formatDateInput(v))} keyboardType="number-pad"/>
          <Field label="Término do desafio" placeholder={datePlaceholder} value={ends} onChangeText={v=>setEnds(formatDateInput(v))} keyboardType="number-pad"/>
          <Field label="Meta de treinos por participante" value={goal} onChangeText={setGoal} keyboardType="number-pad"/>
          <Button disabled={busy} onPress={()=>void run(async()=>{const data=fitnessChallengeSchema.parse({title,startsAt:dateInputToIso(starts),endsAt:dateInputToIso(ends),goal:Number(goal)});await api(`/fitness-groups/${selected}/challenges`,'POST',data);setChallenge(false);setTitle('');await detail.reload();})}>Salvar desafio</Button>
        </Card>}
        {detail.data.challenges.map(c=><Card key={c.id}><Label size={18} bold>{c.title}</Label><Label>{formatDate(c.startsAt)} a {formatDate(c.endsAt)} · meta: {c.goal} treinos</Label><Label size={12} muted>Contam treinos concluídos após entrar no grupo, dentro do período. Sem pontos extras por foto ou comentário.</Label>
          {!c.ranking.length&&<Label muted>Aguardando participantes.</Label>}{c.ranking.map((r,i)=><Label key={i}>{i+1}. {r.name}: {r.count} / {c.goal} treinos {r.count>=c.goal?'✓':''}</Label>)}
        </Card>)}
        <Label size={20} bold>Conquistas do grupo</Label>
        {!detail.data.posts.length&&<Notice>Nenhum registro compartilhado ainda.</Notice>}
        {detail.data.posts.map(p=><Card key={p.id}><Label bold>{p.name}</Label><Label size={12} muted>{new Date(p.createdAt).toLocaleString('pt-BR')}</Label>{!!p.comment&&<Label>{p.comment}</Label>}{!!p.photo&&<Image source={{uri:p.photo}} accessibilityLabel="Foto compartilhada no grupo" style={{width:'100%',height:260}} resizeMode="contain"/>}</Card>)}
        <Button variant="secondary" onPress={()=>void detail.reload()}>Atualizar grupo</Button>
      </>}
    </>:<>
      {personal&&<Button onPress={()=>setCreating(!creating)}>Criar grupo</Button>}
      {creating&&<Card><Field label="Nome do grupo" value={name} onChangeText={setName}/><Field label="Descrição do grupo" value={description} onChangeText={setDescription} multiline/>
        <Button disabled={busy} onPress={()=>void run(async()=>{const g=await api<FitnessGroupSummary>('/fitness-groups','POST',fitnessGroupSchema.parse({name,description}));setCreating(false);setName('');setDescription('');await groups.reload();setSelected(g.id);})}>Salvar grupo</Button>
      </Card>}
      {groups.loading&&<Notice>Carregando grupos…</Notice>}
      {!groups.loading&&!groups.data?.length&&<Notice>{personal?'Crie um grupo e envie o convite aos seus alunos.':'Você ainda não participa de grupos. Peça um convite ao seu personal.'}</Notice>}
      {groups.data?.map(g=><Card key={g.id}><Label bold>{g.name}</Label><Label muted>{g.members} participante(s) · {g.ownerName}</Label><Button variant="secondary" onPress={()=>setSelected(g.id)}>Abrir grupo {g.name}</Button></Card>)}
    </>}
    {leave&&<Confirm title="Sair do grupo?" description="Seus registros compartilhados voltarão a ficar privados entre você e seu personal. Você sairá do ranking do grupo." onClose={()=>setLeave(false)} onConfirm={async()=>{await api(`/fitness-groups/${selected}/leave`,'POST',{});setSelected(null);await groups.reload();}}/>}
  </Page>;
}
