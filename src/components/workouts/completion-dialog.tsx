import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button, Choices, Dialog, Field, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import { useResource } from '@/features/personal/use-resource';
import { pickWorkoutPhoto } from '@/features/personal/workout-photo';
import type { FitnessGroupSummary } from '../../../shared/groups';
import type { WorkoutData } from '../../../shared/workouts';
export function CompletionDialog({workout,close,reload,recording,error,retry}:{workout:WorkoutData;close:()=>void;reload:()=>Promise<void>;recording:boolean;error:string;retry:()=>void}){
  const [compose,setCompose]=useState(false),[comment,setComment]=useState(''),[photo,setPhoto]=useState(''),[groupId,setGroupId]=useState(''),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
  const [requestId]=useState(()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const groups=useResource<FitnessGroupSummary[]>(compose?'/fitness-groups':null);
  async function choosePhoto(){setBusy(true);setFailure('');try{const value=await pickWorkoutPhoto();if(value)setPhoto(value);}catch(e){setFailure(message(e));}finally{setBusy(false);}}
  return <Dialog title="Treino concluído!" onClose={()=>{if(!busy&&!recording)close();}}>
    <View style={{gap:12}}>
      <Label>Deseja postar uma foto ou fazer um comentário?</Label>
      <Notice>{recording?'Registrando conclusão…':''}</Notice><Notice error>{error||failure}</Notice>
      {error&&<Button disabled={recording} onPress={retry}>Tentar registrar conclusão</Button>}
      {!compose?<>
        <Button disabled={recording||!!error} onPress={()=>{setCompose(true);void choosePhoto();}}>Postar uma foto</Button>
        <Button disabled={recording||!!error} variant="secondary" onPress={()=>setCompose(true)}>Fazer um comentário</Button>
        <Button disabled={recording} variant="secondary" onPress={close}>Agora não</Button>
      </>:<>
        <Field label="Comentário do treino" value={comment} onChangeText={setComment} multiline maxLength={2000} editable={!busy}/>
        {!!photo&&<Image source={{uri:photo}} accessibilityLabel="Foto selecionada" style={{height:220,width:'100%'}} resizeMode="contain"/>}
        <Button disabled={busy} variant="secondary" onPress={()=>void choosePhoto()}>{photo?'Trocar foto':'Adicionar foto'}</Button>
        {photo&&<Button disabled={busy} variant="secondary" onPress={()=>setPhoto('')}>Remover foto</Button>}
        <View pointerEvents={busy?'none':'auto'}><Choices label="Compartilhar com" value={groupId} onChange={setGroupId} options={[{value:'',label:'Somente meu personal'},...(groups.data??[]).map(g=>({value:g.id,label:g.name}))]}/></View>
        <Notice error>{groups.error}</Notice>
        <Label size={12} muted>{groupId?'A foto e o comentário ficarão visíveis ao personal e aos participantes deste grupo.':'O registro ficará privado entre você e seu personal.'}</Label>
        <Button disabled={busy||recording||!!error||(!photo&&!comment.trim())} onPress={async()=>{setBusy(true);setFailure('');try{await api(`/me/workouts/${workout.id}/feedbacks`,'POST',{requestId,comment,photo,groupId:groupId||null});await reload();close();}catch(e){setFailure(message(e));}finally{setBusy(false);}}}>{busy?'Enviando…':'Enviar registro'}</Button>
      </>}
    </View>
  </Dialog>;
}
