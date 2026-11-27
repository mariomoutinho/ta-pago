import { View } from 'react-native';
import { Button, Label } from '@/components/personal/ui';
import { useSession } from '@/features/personal/auth';
import type { Prescription } from '../../../shared/workouts';
import { prescribedSets } from '../../../shared/workout-progress';
import { initialSeries } from '../../../shared/series';
import { formatRest } from '../../../shared/rest-timer';
import { brazilToday } from '../../../shared/notifications';
import { exerciseKey } from '../../../shared/workout-groups';
import { useRestTimer } from './rest-timer';

export function ProfessionalExerciseSummary({ item, workoutId, disabled }: {
  item: Prescription; workoutId: string; disabled: boolean;
}) {
  const { user } = useSession();
  const itemId = exerciseKey(item), rows = initialSeries(item);
  const total = prescribedSets(item).reduce((sum, count) => sum + count, 0);
  const date = brazilToday();
  const key = `tapago.professional-rest.${user?.id}.${workoutId}.${itemId}.${JSON.stringify(rows)}`;
  const rest = useRestTimer(key, workoutId, 0, date);
  const intervals = [...new Set(rows.map(row => row.restSeconds).filter((seconds): seconds is number => seconds != null && seconds > 0))];
  return <View style={{ gap: 8, paddingTop: 4 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Label bold>{total} {total === 1 ? 'série' : 'séries'}</Label>
      {intervals.map(seconds => <Button key={seconds} variant="secondary"
        label={`Iniciar descanso de ${formatRest(seconds)} para ${item.exercise?.name}`}
        disabled={disabled || !rest.ready || rest.active()}
        onPress={() => {
          rest.prepare();
          const startedAt = Date.now();
          rest.start({ workoutId, itemId, revision: 0, version: 0, row: rows.findIndex(row => row.restSeconds === seconds), date, startedAt, deadline: startedAt + seconds * 1000 });
        }}>Descanso {formatRest(seconds)}</Button>)}
      {!intervals.length && <Label muted>Sem intervalo prescrito</Label>}
      {rest.active() && <Button variant="secondary" label={`Cancelar descanso de ${item.exercise?.name}`} onPress={rest.cancel}>Cancelar descanso</Button>}
    </View>
    {rest.inline(itemId)}
    {!!rest.announcement && <View accessibilityLiveRegion="polite"><Label size={12}>{rest.announcement}</Label></View>}
  </View>;
}
