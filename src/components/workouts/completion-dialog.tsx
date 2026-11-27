import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, View } from 'react-native';
import { Button, Choices, Dialog, Field, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import { useResource } from '@/features/personal/use-resource';
import { pickWorkoutPhoto } from '@/features/personal/workout-photo';
import type { FitnessGroupSummary } from '../../../shared/groups';
import type { WorkoutData } from '../../../shared/workouts';
import { brazilToday } from '../../../shared/notifications';
export function CompletionDialog({workout,close,reload,recording,error,retry,totalSets}:{workout:WorkoutData;close:()=>void;reload:()=>Promise<void>;recording:boolean;error:string;retry:()=>void;totalSets:number}){
  const [compose,setCompose]=useState(false),[comment,setComment]=useState(''),[photo,setPhoto]=useState(''),[groupId,setGroupId]=useState(''),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
  const sending=useRef(false),[sent,setSent]=useState(false);
  const opacity=useRef(new Animated.Value(1)).current;
  useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(alive&&!reduced){opacity.setValue(0.5);Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}).start();}});return()=>{alive=false;opacity.stopAnimation();};},[opacity]);
  const [requestId]=useState(()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const groups=useResource<FitnessGroupSummary[]>(compose?'/fitness-groups':null);
  async function choosePhoto(){setBusy(true);setFailure('');try{const value=await pickWorkoutPhoto();if(value)setPhoto(value);}catch(e){setFailure(message(e));}finally{setBusy(false);}}
  return <Dialog title="TÁ PAGO!" animationType="none" onClose={()=>{if(!busy&&!recording)close();}}>
    <View style={{gap:12}}>
      <Animated.View style={{opacity}}><Label size={30}>✓</Label></Animated.View>
      <Label bold>Treino finalizado com sucesso.</Label>
      <Label>Mais um passo em direção ao seu objetivo.</Label>
      <Label size={12} muted>{workout.exercises.length} exercícios concluídos · {totalSets} séries realizadas</Label>
      <Label bold>Como foi seu treino hoje?</Label>
      <Notice>{recording?'Registrando conclusão…':''}</Notice><Notice error>{error||failure}</Notice>
      {error&&<Button disabled={recording} onPress={retry}>Tentar registrar conclusão</Button>}
      {sent ? <><Notice>Feedback enviado com sucesso.</Notice><Button onPress={close}>Voltar ao treino</Button></> : <>
        <Field label="Feedback ao professor (opcional)" placeholder="Conte ao seu professor como foi seu treino, suas dificuldades ou observações." value={comment} onChangeText={setComment} multiline maxLength={2000} editable={!busy}/>
        {!compose&&<Button disabled={busy} variant="secondary" onPress={()=>setCompose(true)}>Adicionar foto ou compartilhar com grupo</Button>}
        {compose&&<>
        {!!photo&&<Image source={{uri:photo}} accessibilityLabel="Foto selecionada" style={{height:220,width:'100%'}} resizeMode="contain"/>}
        <Button disabled={busy} variant="secondary" onPress={()=>void choosePhoto()}>{photo?'Trocar foto':'Adicionar foto'}</Button>
        {photo&&<Button disabled={busy} variant="secondary" onPress={()=>setPhoto('')}>Remover foto</Button>}
        <View pointerEvents={busy?'none':'auto'}><Choices label="Compartilhar com" value={groupId} onChange={setGroupId} options={[{value:'',label:'Somente meu personal'},...(groups.data??[]).map(g=>({value:g.id,label:g.name}))]}/></View>
        <Notice error>{groups.error}</Notice>
        <Label size={12} muted>{groupId?'A foto e o comentário ficarão visíveis ao personal e aos participantes deste grupo.':'O registro ficará privado entre você e seu personal.'}</Label>
        </>}
        <Button disabled={busy||recording||!!error||(!photo&&!comment.trim())} onPress={async()=>{if(sending.current)return;sending.current=true;setBusy(true);setFailure('');try{await api(`/me/workouts/${workout.id}/feedbacks`,'POST',{requestId,comment,photo,groupId:groupId||null,completionId:workout.completions?.find(c=>c.completedOn===brazilToday())?.id});setSent(true);await reload();}catch(e){setFailure(message(e));}finally{sending.current=false;setBusy(false);}}}>{busy?'Enviando…':failure?'Tentar novamente':'Enviar feedback'}</Button>
        <Button disabled={busy||recording} variant="secondary" onPress={close}>Agora não</Button>
      </>}
    </View>
  </Dialog>;
}
