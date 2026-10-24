import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, Confirm, Dialog, Label, s } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
import type { Prescription } from "../../../shared/workouts";
import { combineExercises, exerciseBlocks, exerciseKey, removeExercises, separateExercises } from "../../../shared/workout-groups";
import { ExerciseCheckbox } from "./exercise-checkbox";
import { ExerciseExpansion } from "./exercise-expansion";
import { SortableExercises } from "./sortable-exercises";
export type WorkoutChange = "order" | "combine" | "separate" | "delete";
let sequence = 0;
export function WorkoutExerciseList({ items, disabled = false, change, itemMenu, details }: {
  items: Prescription[]; disabled?: boolean;
  change?: (next: Prescription[], operation: WorkoutChange) => Promise<void>;
  itemMenu?: (key: string) => void;
  details: (item: Prescription, index: number) => ReactNode;
}) {
  const t = useTheme();
  const blocks = exerciseBlocks(items), ids = blocks.map(block => block.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);
  const [remove, setRemove] = useState<Set<string> | null>(null);
  const chosen = blocks.filter(block => selected.has(block.id));
  const selectedItems = chosen.flatMap(block => block.items);
  const all = ids.length > 0 && ids.every(id => expanded.has(id));
  const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
  const title = (block: typeof blocks[number]) => block.items.map(item => item.exercise?.name ?? "Exercício indisponível").join(" + ");
  const toggle = (key: string) => setExpanded(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const toggleSelection = (key: string) => setSelected(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  async function apply(next: Prescription[], operation: WorkoutChange) {
    await change?.(next, operation);
    if (operation !== "order") { setSelected(new Set()); setMenu(null); }
  }
  async function reorder(from: number, to: number) {
    if (disabled || !change || from === to || to < 0 || to >= blocks.length) return;
    const next = [...blocks]; const [block] = next.splice(from, 1); next.splice(to, 0, block);
    await apply(next.flatMap(block => block.items), "order");
  }
  const menuBlock = blocks.find(block => block.id === menu);
  const removeItems = items.filter(item => remove?.has(exerciseKey(item)));
  return <View style={{ gap: 10 }}>
    {!!ids.length && <View style={s.row}>
      {change && <View style={{ flexDirection: "row", alignItems: "center" }}><ExerciseCheckbox label="Selecionar todos os exercícios" checked={allSelected} mixed={chosen.length > 0 && !allSelected} disabled={disabled} toggle={() => setSelected(allSelected ? new Set() : new Set(ids))} /><Label>Selecionar todos</Label></View>}
      <Button variant="secondary" onPress={() => setExpanded(all ? new Set() : new Set(ids))}>{all ? "Recolher todos" : "Expandir todos"}</Button>
    </View>}
    {!!selectedItems.length && change && <Card style={{ padding: 12, marginBottom: 0, backgroundColor: t.accentSoft }}>
      <Label bold>{selectedItems.length} exercício(s) selecionado(s)</Label>
      <View style={[s.row, { gap: 8, marginTop: 8 }]}>
        <Button disabled={disabled || chosen.length < 2} onPress={() => void apply(combineExercises(items, new Set(chosen.map(block => block.id)), "block-" + Date.now() + "-" + ++sequence), "combine").catch(() => {})}>Combinar selecionados</Button>
        {chosen.some(block => block.groupId) && <Button disabled={disabled} variant="secondary" onPress={() => void apply(separateExercises(items, selected), "separate").catch(() => {})}>Separar selecionados</Button>}
        <Button disabled={disabled} variant="danger" onPress={() => setRemove(new Set(selectedItems.map(exerciseKey)))}>Excluir selecionados</Button>
        <Button disabled={disabled} variant="secondary" onPress={() => setSelected(new Set())}>Limpar seleção</Button>
      </View>
    </Card>}
    <SortableExercises ids={ids} labels={Object.fromEntries(blocks.map(block => [block.id, title(block)]))} disabled={disabled || !change} reorder={(from, to) => void reorder(from, to).catch(() => {})}>{(key, handle) => {
      const block = blocks.find(block => block.id === key)!;
      const name = title(block), open = expanded.has(key), index = ids.indexOf(key);
      return <Card style={{ padding: 10, marginBottom: 8, borderColor: selected.has(key) ? t.accent : t.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {change && handle}
          {change && <ExerciseCheckbox label={"Selecionar " + name} checked={selected.has(key)} disabled={disabled} toggle={() => toggleSelection(key)} />}
          <Pressable accessibilityRole="button" accessibilityLabel={"Detalhes de " + name} aria-expanded={open} onPress={() => toggle(key)} style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" }}>
            {block.items.map(item => <Label key={exerciseKey(item)} bold>{item.exercise?.name ?? "Exercício indisponível"}</Label>)}
          </Pressable>
          {change && <Pressable accessibilityRole="button" accessibilityLabel={"Ações de " + name} disabled={disabled} onPress={() => { if (!block.groupId && itemMenu) itemMenu(exerciseKey(block.items[0])); else setMenu(key); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Label size={22}>⋯</Label></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel={(open ? "Recolher " : "Expandir ") + name} aria-expanded={open} onPress={() => toggle(key)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Label>{open ? "⌃" : "⌄"}</Label></Pressable>
        </View>
        <ExerciseExpansion open={open}>
          {block.groupId && <Label muted>Bloco combinado · execute os exercícios na sequência indicada pelo personal.</Label>}
          {block.items.map(item => <View key={exerciseKey(item)} style={{ gap: 10, paddingTop: block.groupId ? 10 : 0 }}>
            {block.groupId && itemMenu && <Button label={"Ações de " + item.exercise?.name} disabled={disabled} variant="secondary" onPress={() => itemMenu(exerciseKey(item))}>Ações deste exercício</Button>}
            {details(item, items.indexOf(item))}
          </View>)}
          {change && <View style={s.row}>
            <Button label={"Subir exercício " + (index + 1)} disabled={disabled || index === 0} variant="secondary" onPress={() => void reorder(index, index - 1).catch(() => {})}>↑</Button>
            <Button label={"Descer exercício " + (index + 1)} disabled={disabled || index === blocks.length - 1} variant="secondary" onPress={() => void reorder(index, index + 1).catch(() => {})}>↓</Button>
          </View>}
        </ExerciseExpansion>
      </Card>;
    }}</SortableExercises>
    {menuBlock && <Dialog title={menuBlock.groupId ? "Ações do bloco" : "Ações do exercício"} onClose={() => setMenu(null)}>
      <View style={{ gap: 12 }}>
        {menuBlock.groupId && <Button disabled={disabled} variant="secondary" onPress={() => void apply(separateExercises(items, new Set([menuBlock.id])), "separate").catch(() => {})}>Separar exercícios</Button>}
        <Button disabled={disabled} variant="danger" onPress={() => { setRemove(new Set(menuBlock.items.map(exerciseKey))); setMenu(null); }}>{menuBlock.groupId ? "Excluir bloco" : "Excluir"}</Button>
      </View>
    </Dialog>}
    {remove && <Confirm title="Excluir exercícios selecionados?" description={"Remover deste treino: " + removeItems.map(item => item.exercise?.name ?? "Exercício").join(", ") + ". Os exercícios da biblioteca serão preservados."} onClose={() => setRemove(null)} onConfirm={async () => { await apply(removeExercises(items, remove), "delete"); }} />}
  </View>;
}
