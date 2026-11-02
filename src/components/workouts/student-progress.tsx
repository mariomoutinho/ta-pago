import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import type { Prescription, WorkoutData } from '../../../shared/workouts';
import { prescribedSets, exerciseFinished } from '../../../shared/workout-progress';
import { brazilToday } from '../../../shared/notifications';
import { CompletionDialog } from './completion-dialog';
import { ExerciseCheckbox } from './exercise-checkbox';
type Progress=NonNullable<Prescription['studentProgress']>;
export function useStudentProgress(workout:WorkoutData,student:{revision:number;editable:boolean;reload:()=>Promise<void>}|undefined,cancelRest:()=>void){
  const initial=()=>Object.fromEntries(workout.exercises.flatMap(item=>item.id&&item.studentProgress?[[item.id,item.studentProgress]]:[])) as Record<string,Progress>;
  const [progress,setProgress]=useState(initial),latest=useRef(progress),lock=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [celebrate,setCelebrate]=useState(false),[recording,setRecording]=useState(false),[completionError,setCompletionError]=useState('');
  const attempted=useRef(false),recordLock=useRef(false);
  const signature=JSON.stringify(workout.exercises.map(i=>[i.id,i.studentProgress]));
  useEffect(()=>{if(!lock.current){const next=initial();latest.current=next;setProgress(next);}},[signature,student?.revision]);
  const get=(item:Prescription)=>{const p=latest.current[item.id??''];return p?.date===brazilToday()?p:undefined;};
  const counts=(item:Prescription)=>get(item)?.completedSets??prescribedSets(item).map(()=>0);
  const finished=(item:Prescription)=>exerciseFinished(prescribedSets(item),counts(item));
  const all=workout.exercises.length>0&&workout.exercises.every(finished);
  const recorded=(workout.completions??[]).some(c=>c.completedOn===brazilToday());
  async function record(){
    if(recordLock.current)return;recordLock.current=true;attempted.current=true;setCelebrate(true);setRecording(true);setCompletionError('');cancelRest();
    try{await api(`/me/workouts/${workout.id}/completion`,'POST',{});await student?.reload();}
    catch(e){setCompletionError(message(e));}finally{recordLock.current=false;setRecording(false);}
  }
  useEffect(()=>{if(student?.editable&&all&&!recorded&&!attempted.current)void record();},[all,recorded,student?.editable]);
  async function save(item:Prescription,next:number[]){
    if(lock.current||!student?.editable||!item.id)return false;lock.current=true;setBusy(true);setError('');
    try{const result=await api<Progress>(`/me/workout-exercises/${item.id}/progress`,'PUT',{revision:student.revision,version:get(item)?.version??0,completedSets:next});
      latest.current={...latest.current,[item.id]:result};setProgress(latest.current);return true;
    }catch(e){setError(message(e));return false;}finally{lock.current=false;setBusy(false);}
  }
  async function interval(item:Prescription,row:number,seconds:number,label:string,start:(s:number,l:string)=>void){
    const totals=prescribedSets(item),next=[...counts(item)];if(next[row]>=totals[row])return;
    next[row]++;if(await save(item,next))start(seconds,label);
  }
  return {counts,interval,busy,completion:student?(item:Prescription)=><ExerciseCheckbox
    label={`Concluir exercício ${item.exercise?.name??'Exercício'}`} checked={finished(item)}
    disabled={busy||!student.editable} toggle={()=>void save(item,prescribedSets(item).map(n=>finished(item)?0:n))}/>:undefined,
    notice:<View><Notice error>{error}</Notice>{error&&<Button variant="secondary" onPress={()=>void student?.reload()}>Atualizar treino</Button>}</View>,
    dialog:celebrate&&student&&<CompletionDialog workout={workout} close={()=>setCelebrate(false)} reload={student.reload} recording={recording} error={completionError} retry={()=>void record()}/>};
}
