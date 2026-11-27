import { useEffect, useRef, useState } from 'react';
import { AppState, Vibration, View } from 'react-native';
import { Label } from '@/components/personal/ui';
import { useTheme } from '@/hooks/use-theme';
import { prepareRestSound } from '@/features/personal/rest-sound';
import { readWorkoutSession, writeWorkoutSession } from '@/features/personal/workout-session-storage';
import { formatRest, remainingRest } from '../../../shared/rest-timer';
import type { ExecutionRest } from '../../../shared/workout-execution';

export function useRestTimer(key: string, workoutId: string, revision: number, date: string) {
  const [timer, setTimer] = useState<ExecutionRest | null>(null), current = useRef<ExecutionRest | null>(null);
  const [remaining, setRemaining] = useState(0), [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const sound = useRef<ReturnType<typeof prepareRestSound> | null>(null);
  function update(value: ExecutionRest | null) {
    current.current = value; setTimer(value);
    void writeWorkoutSession(key, value ? JSON.stringify(value) : null).catch(() => {});
  }
  function cancel() { update(null); setAnnouncement(''); sound.current?.close(); sound.current = null; }
  function prepare() { sound.current?.close(); sound.current = prepareRestSound(); }
  function start(value: ExecutionRest) { setAnnouncement(''); update(value); setRemaining(remainingRest(value.deadline, Date.now())); }
  useEffect(() => {
    let alive = true;
    setReady(false); current.current = null; setTimer(null);
    void readWorkoutSession(key).then(raw => {
      if (!alive) return;
      try {
        const value: ExecutionRest | null = raw ? JSON.parse(raw) : null;
        if (value && value.date === date && Number.isFinite(value.deadline) && value.deadline > Date.now() && value.startedAt < value.deadline && typeof value.itemId === 'string') {
          current.current = value; setTimer(value); setRemaining(remainingRest(value.deadline, Date.now()));
        } else { current.current = null; setTimer(null); if (value?.date === date && value.workoutId === workoutId && value.deadline <= Date.now()) setAnnouncement('Descanso concluído. Próxima série liberada.'); }
      } catch { current.current = null; setTimer(null); }
    }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; sound.current?.close(); };
  }, [key, date]);
  useEffect(() => {
    if (!timer) return;
    function tick() {
      if (current.current !== timer) return;
      const left = remainingRest(timer!.deadline, Date.now()); setRemaining(left);
      if (!left) { sound.current?.play(); Vibration.vibrate([0, 300, 150, 300]); setAnnouncement('Descanso concluído. Próxima série liberada.'); update(null); }
    }
    tick(); const interval = setInterval(tick, 250);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [timer]);
  return { timer, remaining, ready, announcement, active: () => !!current.current && current.current.deadline > Date.now(), start, cancel, prepare,
    inline: (itemId: string) => timer?.workoutId === workoutId && timer.revision === revision && timer.itemId === itemId && remaining > 0
      ? <InlineRest remaining={remaining} duration={(timer.deadline - timer.startedAt) / 1000} /> : null };
}
function InlineRest({ remaining, duration }: { remaining: number; duration: number }) {
  const t = useTheme();
  return <View style={{ gap: 8, paddingTop: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Label>Descanso</Label><View accessibilityRole="timer" accessibilityLabel={`Descanso: ${formatRest(remaining)}`}><Label bold>{formatRest(remaining)}</Label></View></View>
    <View accessibilityRole="progressbar" accessibilityLabel="Tempo de descanso restante" accessibilityValue={{ min: 0, max: Math.ceil(duration), now: remaining }} style={{ height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' }}>
      <View style={{ height: 4, width: `${Math.min(100, remaining / duration * 100)}%`, backgroundColor: t.accent }} />
    </View>
  </View>;
}
