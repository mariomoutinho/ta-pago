import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Button, Dialog, Label, Notice } from "@/components/personal/ui";
import type { WorkoutData } from "../../../shared/workouts";
import { PrescriptionView } from "./exercise-view";

export function WorkoutWindow({ workout, close, edit, add }: {
  workout: WorkoutData; close: () => void; edit?: () => void; add?: () => void;
}) {
  const t = useTheme();
  const [expanded, setExpanded] = useState<number[]>([]);
  const all = workout.exercises.length > 0 && expanded.length === workout.exercises.length;
  return <Dialog title={workout.name} onClose={close}>
    <View style={{ gap: 12 }}>
      {!!workout.subtitle && <Label bold>{workout.subtitle}</Label>}
      {!!workout.instructions && <Notice>{workout.instructions}</Notice>}
      {(edit || add) && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {edit && <Button variant="secondary" onPress={edit}>Editar e reordenar</Button>}
        {add && <Button onPress={add}>Adicionar exercício</Button>}
      </View>}
      {!!workout.exercises.length && <Button variant="secondary" onPress={() => setExpanded(all ? [] : workout.exercises.map((_, i) => i))}>
        {all ? "Recolher todos" : "Expandir todos"}
      </Button>}
      {!workout.exercises.length && <Notice>Este treino ainda não possui exercícios. Adicione exercícios pela biblioteca.</Notice>}
      {workout.exercises.map((item, i) => {
        const open = expanded.includes(i);
        const name = item.exercise?.name ?? `Exercício ${i + 1}`;
        return <View key={item.id ?? i} style={{ borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Detalhes de ${name}`} aria-expanded={open}
            onPress={() => setExpanded(open ? expanded.filter(index => index !== i) : [...expanded, i])}
            style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Label size={12} muted>{i + 1}</Label>
            <View style={{ flex: 1 }}><Label size={14} bold>{name}</Label></View>
            <Label muted>{open ? "⌃" : "⌄"}</Label>
          </Pressable>
          {open && <View style={{ paddingTop: 10 }}><PrescriptionView item={item} /></View>}
        </View>;
      })}
    </View>
  </Dialog>;
}
