import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button, Label } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { PrescriptionAction } from './prescription-action';
import { Fonts } from '@/constants/theme';

/** Etapa do fluxo no conteúdo da página, sem Modal ou backdrop. */
export function WorkoutScreen({ title, back, children, backLabel = "Voltar", hideHeader = false, prescription = false }: {
  title: string; back: () => void; children: ReactNode; backLabel?: string; hideHeader?: boolean; prescription?: boolean;
}) {
  const theme = useTheme();
  return <View style={{ gap: 18, width: "100%" }}>
    {!hideHeader && prescription ? <View style={{ gap: 24, paddingBottom: 8 }}>
      <View style={{ alignSelf: 'flex-start' }}><PrescriptionAction icon={ArrowLeft} title={backLabel} onPress={back} /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSoft }}><Dumbbell size={26} strokeWidth={1.75} color={theme.accent} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontFamily: Fonts.sans, color: theme.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>{title}</Text>
          <Label size={14} muted>Defina as séries, carga e intervalo do exercício para o treino do aluno.</Label>
        </View>
      </View>
    </View> : !hideHeader && <View style={{ gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ alignSelf: "flex-start" }}><Button variant="secondary" onPress={back}>{backLabel}</Button></View>
      <Label muted>Treinos</Label>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "700" }}>{title}</Text>
    </View>}
    {children}
  </View>;
}
