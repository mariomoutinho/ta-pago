import { Pressable } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { Label } from '@/components/personal/ui';
import { useTheme } from '@/hooks/use-theme';
export function SetCounter({ name, remaining, disabled, register }: { name: string; remaining: number; disabled: boolean; register: () => void }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={remaining ? `Registrar série de ${name}: ${remaining} restantes` : `${name}: concluído`} accessibilityState={{ disabled: disabled || !remaining }} disabled={disabled || !remaining} onPress={register}
    style={({ pressed }) => ({ width: 48, height: 48, margin: 2, borderRadius: 8, borderWidth: 1, borderColor: remaining ? t.border : '#ffffff88', backgroundColor: remaining ? t.backgroundElement : '#ffffff22', opacity: pressed ? 0.7 : disabled ? 0.6 : 1, alignItems: 'center', justifyContent: 'center' })}>
    {remaining ? <Label size={20} bold>{remaining}</Label> : <Check size={22} color="#fff" />}
  </Pressable>;
}
