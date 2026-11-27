import type { LucideIcon } from 'lucide-react-native';
import { Text, type ViewStyle } from 'react-native';
import { StudioAction } from '@/components/studio/controls';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PrescriptionAction({ title, icon: Icon, onPress, primary = false, disabled = false, label, style }: {
  title: string; icon: LucideIcon; onPress: () => void; primary?: boolean; disabled?: boolean; label?: string; style?: ViewStyle;
}) {
  const t = useTheme(), color = primary ? '#FFFFFF' : t.text;
  return <StudioAction label={label ?? title} primary={primary} disabled={disabled} onPress={onPress} style={style}>
    <Icon size={18} strokeWidth={1.75} color={color} />
    <Text style={{ fontFamily: Fonts.sans, color, fontSize: 13, fontWeight: '600', flexShrink: 1 }}>{title}</Text>
  </StudioAction>;
}
