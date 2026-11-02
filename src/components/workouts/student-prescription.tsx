import { useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Field, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import type { Prescription } from '../../../shared/workouts';
import { PrescriptionView } from './exercise-view';

export function StudentPrescription({ item, revision, editable, reload, startRest }: {
  item: Prescription; revision: number; editable: boolean; reload: () => Promise<void>;
  startRest: (seconds: number, label: string) => void;
}) {
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false);
  const [values, setValues] = useState<string[]>([]), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const rows = item.series.length ? item.series : [{ load: item.load }];
  const display = { ...item, load: item.studentLoads?.loads[0] ?? item.load,
    series: item.series.map((row,i) => ({ ...row, load: item.studentLoads?.loads[i] ?? row.load })) };
  function edit() {
    setValues(rows.map((row,i) => String(item.studentLoads?.loads[i] ?? row.load ?? '')));
    setError(''); setSuccess(''); setEditing(true);
  }
  return <View style={{ gap: 8 }}>
    <PrescriptionView item={display} studentLoads startRest={editable ? startRest : undefined} />
    <Notice>{success}</Notice>
    {editable && <Button variant="secondary" onPress={edit}>Editar cargas</Button>}
    {editing && <Dialog title="Minhas cargas" onClose={() => { if (!busy) setEditing(false); }}>
      <View style={{ gap: 10 }}>
        <Label>Ajuste a carga usada em cada série. Deixe em branco para usar a carga prescrita pelo personal.</Label>
        {values.map((value,i) => <Field key={i} label={`Minha carga ${i + 1} (kg)`} keyboardType="decimal-pad" value={value}
          onChangeText={next => setValues(current => current.map((v,index) => index === i ? next : v))} />)}
        <Notice error>{error}</Notice>
        <Button disabled={busy} onPress={async () => {
          setBusy(true); setError('');
          try {
            const loads = values.map(value => {
              if (!value.trim()) return null;
              if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) throw new Error('Informe cargas válidas, como 20 ou 12,5.');
              const number = Number(value.trim().replace(',', '.'));
              if (!Number.isFinite(number) || number > 1000000) throw new Error('Carga fora do limite permitido.');
              return number;
            });
            await api(`/me/workout-exercises/${item.id}/loads`, 'PUT', { revision, loads });
            await reload(); setEditing(false); setSuccess('Suas cargas foram salvas.');
          } catch (e) { setError(message(e)); } finally { setBusy(false); }
        }}>{busy ? 'Salvando…' : 'Salvar minhas cargas'}</Button>
        <Button disabled={busy} variant="secondary" onPress={() => setEditing(false)}>Cancelar</Button>
      </View>
    </Dialog>}
  </View>;
}
