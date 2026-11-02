import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import type { Prescription } from '../../../shared/workouts';
import { PrescriptionView } from './exercise-view';
import { initialSeries, seriesFields, seriesValue } from '../../../shared/series';

export function StudentPrescription({ item, revision, editable, startRest, completedSets, progressBusy }: {
  item: Prescription; revision: number; editable: boolean; reload: () => Promise<void>;
  startRest: (row: number, seconds: number, label: string) => void;
  completedSets: number[]; progressBusy: boolean;
}) {
  const rows=initialSeries(item),initial=rows.map((row,i)=>String(item.studentLoads?.loads[i]??row.load??''));
  const [values,setValues]=useState(initial),[error,setError]=useState(''),[status,setStatus]=useState('');
  const latest=useRef(initial),saved=useRef(JSON.stringify(initial)),focused=useRef(false),pending=useRef(0),queue=useRef(Promise.resolve());
  const snapshot=JSON.stringify(initial);
  useEffect(()=>{if(!focused.current&&!pending.current){const next=JSON.parse(snapshot) as string[];latest.current=next;saved.current=snapshot;setValues(next);}},[snapshot,revision]);
  function save(){
    focused.current=false;const raw=[...latest.current],key=JSON.stringify(raw);if(key===saved.current&&!error)return;
    let loads:(number|null)[];
    try{loads=raw.map(value=>{if(!value.trim())return null;if(!/^\d+(?:[.,]\d+)?$/.test(value.trim()))throw new Error('Informe cargas como 20 ou 12,5.');const n=Number(value.trim().replace(',','.'));if(!Number.isFinite(n)||n>1000000)throw new Error('Carga fora do limite permitido.');return n;});}catch(e){setError(message(e));return;}
    pending.current++;setStatus('Salvando carga…');setError('');
    queue.current=queue.current.catch(()=>{}).then(async()=>{try{await api(`/me/workout-exercises/${item.id}/loads`,'PUT',{revision,loads});saved.current=key;setError('');setStatus('Carga salva.');}catch(e){setError(message(e));setStatus('Carga não salva. Toque no campo e saia novamente para tentar.');}finally{pending.current--;}});
  }
  return <View style={{gap:8}}>
    <PrescriptionView item={item} hideSeries />
    {rows.map((row,i)=>{
      const left=Math.max(0,row.sets-(completedSets[i]??0));
      return <View key={i} style={{gap:8,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#8885'}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>
          <View><Label size={12} bold>Séries restantes</Label><Label size={20} bold>{left} / {row.sets}</Label></View>
          {!!row.repetitions&&<View><Label size={12} bold>Repetições</Label><Label size={20}>{row.repetitions}</Label></View>}
        </View>
        <Field label={`Carga ${i+1} (kg)`} value={values[i]??''} keyboardType="decimal-pad" editable={editable}
          onFocus={()=>{focused.current=true;}} onBlur={save}
          onChangeText={value=>{const next=latest.current.map((v,j)=>j===i?value:v);latest.current=next;setValues(next);setStatus('');}} />
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
          {seriesFields(row.type??'repetitions-load').filter(f=>!['combined','load','restSeconds'].includes(f.key)).map(f=><View key={f.key}><Label size={12} bold>{f.label}</Label><Label>{seriesValue(row,f.key)||'—'}</Label></View>)}
          {row.restSeconds!=null&&row.restSeconds>0&&<Button variant="secondary" disabled={!editable||progressBusy||left===0}
            label={`Intervalo da série ${i+1}: ${row.restSeconds} segundos`}
            onPress={()=>startRest(i,row.restSeconds!,`${item.exercise?.name??'Exercício'} · série ${i+1}`)}>Intervalo · {row.restSeconds} s ▶</Button>}
        </View>
      </View>;
    })}
    <Notice error>{error}</Notice><Notice>{status}</Notice>
  </View>;
}
