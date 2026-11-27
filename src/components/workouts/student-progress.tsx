import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Notice } from '@/components/personal/ui';
import { api, message } from '@/features/personal/api';
import { useTheme } from '@/hooks/use-theme';
import type { Prescription, WorkoutData } from '../../../shared/workouts';
import { prescribedSets, exerciseFinished } from '../../../shared/workout-progress';
import { executionTotals, nextSet, undoSet } from '../../../shared/workout-execution';
import { brazilToday } from '../../../shared/notifications';
import { CompletionDialog } from './completion-dialog';
import { SetCounter } from './set-counter';
import type { useRestTimer } from './rest-timer';

type Progress = NonNullable<Prescription['studentProgress']>;
export function useStudentProgress(workout: WorkoutData, student: { revision: number; editable: boolean; reload: () => Promise<void> } | undefined, rest: ReturnType<typeof useRestTimer>) {
  const t = useTheme();
  const initial = () => Object.fromEntries(workout.exercises.flatMap(item => item.id && item.studentProgress ? [[item.id, item.studentProgress]] : [])) as Record<string, Progress>;
  const [progress, setProgress] = useState(initial), latest = useRef(progress), lock = useRef(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false), [recording, setRecording] = useState(false), [completionError, setCompletionError] = useState('');
  const attempted = useRef(false), recordLock = useRef(false), lastAction = useRef(0);
  const signature = JSON.stringify(workout.exercises.map(i => [i.id, i.studentProgress]));
  useEffect(() => { if (!lock.current) { const next = initial(); latest.current = next; setProgress(next); } }, [signature, student?.revision]);
  const get = (item: Prescription) => { const p = latest.current[item.id ?? '']; return p?.date === brazilToday() ? p : undefined; };
  useEffect(() => {
    const timer = rest.timer;
    if (!student || !rest.ready || !timer || timer.workoutId !== workout.id) return;
    const item = workout.exercises.find(item => item.id === timer.itemId);
    if (!item || timer.revision !== student.revision || timer.version !== get(item)?.version) rest.cancel();
  }, [rest.ready, rest.timer, signature, student?.revision]);
  const counts = (item: Prescription) => get(item)?.completedSets ?? prescribedSets(item).map(() => 0);
  const finished = (item: Prescription) => exerciseFinished(prescribedSets(item), counts(item));
  const all = workout.exercises.length > 0 && workout.exercises.every(finished);
  const recorded = (workout.completions ?? []).some(c => c.completedOn === brazilToday());
  const totals = executionTotals(workout.exercises, counts);
  async function record() {
    if (recordLock.current) return;
    recordLock.current = true; attempted.current = true; setCelebrate(true); setRecording(true); setCompletionError(''); rest.cancel();
    try { await api(`/me/workouts/${workout.id}/completion`, 'POST', {}); await student?.reload(); }
    catch (e) { setCompletionError(message(e)); } finally { recordLock.current = false; setRecording(false); }
  }
  useEffect(() => { if (student?.editable && all && !recorded && !attempted.current) void record(); }, [all, recorded, student?.editable]);
  // O servidor é a fonte do progresso. O descanso só começa após o PUT confirmado.
  async function save(item: Prescription, next: number[]) {
    if (lock.current || !student?.editable || !item.id) return null;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await api<Progress>(`/me/workout-exercises/${item.id}/progress`, 'PUT', { revision: student.revision, version: get(item)?.version ?? 0, completedSets: next });
      latest.current = { ...latest.current, [item.id]: result }; setProgress(latest.current); return result;
    } catch (e) { setError(message(e)); return null; } finally { lock.current = false; setBusy(false); }
  }
  async function register(item: Prescription) {
    if (!rest.ready || rest.active() || lock.current || Date.now() - lastAction.current < 500) return;
    const action = nextSet(item, counts(item)); if (!action) return;
    lastAction.current = Date.now(); rest.prepare();
    const result = await save(item, action.next);
    const startedAt = Date.now();
    if (result && action.restSeconds > 0) rest.start({ workoutId: workout.id!, revision: student!.revision, date: result.date, itemId: item.id!, row: action.row, version: result.version, startedAt, deadline: startedAt + action.restSeconds * 1000 });
  }
  async function undo(item: Prescription) {
    const next = undoSet(item, counts(item)); if (!next || lock.current) return;
    if (await save(item, next)) { if (rest.timer?.itemId === item.id) rest.cancel(); attempted.current = recorded; }
  }
  const remaining = (item: Prescription) => prescribedSets(item).reduce((sum, n, i) => sum + n - (counts(item)[i] ?? 0), 0);
  const resting = (item: Prescription) => !!rest.timer && rest.timer.workoutId === workout.id && rest.timer.revision === student?.revision && rest.timer.itemId === item.id && rest.timer.version === get(item)?.version && rest.remaining > 0;
  return { counts, busy, finished,
    completion: student ? (item: Prescription) => <SetCounter name={item.exercise?.name ?? 'Exercício'} remaining={remaining(item) + (resting(item) ? 1 : 0)} disabled={busy || !student.editable || !rest.ready || rest.active()} register={() => void register(item)} /> : undefined,
    inline: student ? (item: Prescription) => <>{resting(item) && rest.inline(item.id!)}</> : undefined,
    undo: student ? (item: Prescription) => <Button label={`Desfazer última série de ${item.exercise?.name}`} disabled={busy || !student.editable || !counts(item).some(Boolean)} variant="secondary" onPress={() => void undo(item)}>Desfazer última série</Button> : undefined,
    notice: student && <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Label size={12}>Progresso</Label><Label bold>{totals.percent}%</Label></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Progresso do treino" accessibilityValue={{ min: 0, max: totals.total, now: totals.done }} style={{ height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' }}><View style={{ height: 4, width: `${totals.percent}%`, backgroundColor: t.accent }} /></View>
      <Label size={12} muted>{totals.done} de {totals.total} séries realizadas</Label>
      {!!rest.announcement&&<View accessibilityLiveRegion="polite"><Label size={12}>{rest.announcement}</Label></View>}
      {rest.active() && !workout.exercises.some(resting) && <Notice>Há um descanso em andamento em outro treino. Aguarde o término.</Notice>}
      <Notice error>{error}</Notice>{error && <Button variant="secondary" onPress={() => void student.reload()}>Atualizar treino</Button>}
    </View>,
    dialog: celebrate && student && <CompletionDialog workout={workout} totalSets={totals.done} close={() => setCelebrate(false)} reload={student.reload} recording={recording} error={completionError} retry={() => void record()} /> };
}
