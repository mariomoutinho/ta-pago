import { useEffect, useRef, useState } from 'react';
import { Vibration, View } from 'react-native';
import { Button, Card, Label } from '@/components/personal/ui';
import { prepareRestSound } from '@/features/personal/rest-sound';
import { formatRest, remainingRest } from '../../../shared/rest-timer';

export function useRestTimer() {
  const [timer, setTimer] = useState<{ deadline: number; label: string } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const sound = useRef<ReturnType<typeof prepareRestSound> | null>(null);
  const alerted = useRef(false);
  function cancel() { setTimer(null); sound.current?.close(); sound.current = null; }
  function start(seconds: number, label: string) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    sound.current?.close(); sound.current = prepareRestSound(); alerted.current = false;
    setRemaining(Math.ceil(seconds)); setTimer({ deadline: Date.now() + seconds * 1000, label });
  }
  useEffect(() => {
    if (!timer) return;
    function tick() {
      const left = remainingRest(timer!.deadline, Date.now()); setRemaining(left);
      if (!left && !alerted.current) {
        alerted.current = true; sound.current?.play(); Vibration.vibrate([0, 300, 150, 300]);
      }
    }
    tick(); const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer]);
  useEffect(() => () => { sound.current?.close(); }, []);
  return { start, panel: timer && <Card>
    <View style={{ gap: 8 }}>
      <Label bold>{remaining ? 'Intervalo em andamento' : 'Intervalo concluído! Hora de continuar.'}</Label>
      <Label>{timer.label}</Label>
      <View accessibilityLiveRegion="polite"><Label size={28} bold>{formatRest(remaining)}</Label></View>
      <Label size={12} muted>Mantenha o treino aberto e o volume ligado para ouvir o alerta.</Label>
      <Button variant="secondary" onPress={cancel}>{remaining ? 'Cancelar intervalo' : 'Fechar intervalo'}</Button>
    </View>
  </Card> };
}
