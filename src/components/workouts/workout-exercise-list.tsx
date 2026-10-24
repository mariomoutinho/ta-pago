import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button, Card, Confirm, Label, s } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
import type { Prescription } from "../../../shared/workouts";
import { combineExercises, detachExercise, detachSelectedExercises, exerciseBlocks, exerciseKey, insertExerciseInGroup, removeExercises, reorderGroupExercises, separateExercises } from "../../../shared/workout-groups";
import { WorkoutScreen } from "./workout-screen";
import { ExerciseCheckbox } from "./exercise-checkbox";
import { ExerciseExpansion } from "./exercise-expansion";
import { SortableExercises } from "./sortable-exercises";
export type WorkoutChange = "order" | "combine" | "separate" | "delete" | "duplicate" | "membership" | "edit";
let sequence = 0;
const nextOccurrenceKey = () => "local-" + Date.now() + "-" + ++sequence;
export function WorkoutExerciseList({ items, disabled = false, change, itemMenu, editItem, addToGroup, normalActions, details }: {
  items: Prescription[]; disabled?: boolean;
  change?: (next: Prescription[], operation: WorkoutChange) => Promise<void>;
  itemMenu?: (key: string, action: string) => void;
  editItem?: (key: string) => void;
  addToGroup?: (groupId: string) => void;
  normalActions?: ReactNode;
  details: (item: Prescription, index: number) => ReactNode;
}) {
  const t = useTheme();
  const blocks = exerciseBlocks(items), ids = blocks.map(block => block.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ block?: string; item?: string } | null>(null);
  const [destination, setDestination] = useState<{ groupId?: string; itemKey?: string } | null>(null);
  const [remove, setRemove] = useState<Set<string> | null>(null);
  const chosen = blocks.filter(block => selected.has(block.id));
  const selectedItems = items.filter(item => selected.has(exerciseKey(item)) || chosen.some(block => block.items.includes(item)));
  const all = ids.length > 0 && ids.every(id => expanded.has(id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const title = (block: typeof blocks[number]) => block.items.map(item => item.exercise?.name ?? "Exercício indisponível").join(" + ");
  const toggle = (key: string) => setExpanded(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const toggleSelection = (keys: string[]) => setSelected(current => { const next = new Set(current); const checked = keys.every(key => next.has(key)); keys.forEach(key => { if (checked) next.delete(key); else next.add(key); }); return next; });
  async function apply(next: Prescription[], operation: WorkoutChange) {
    await change?.(next, operation);
    if (operation !== "order") { setSelected(new Set()); setMenu(null); setDestination(null); }
  }
  async function reorder(from: number, to: number) {
    if (disabled || !change || from === to || to < 0 || to >= blocks.length) return;
    const next = [...blocks]; const [block] = next.splice(from, 1); next.splice(to, 0, block);
    await apply(next.flatMap(block => block.items), "order");
  }
  function combineSelection() {
    const groupId = nextOccurrenceKey();
    void apply(combineExercises(items, new Set(selectedItems.map(exerciseKey)), groupId), "combine").catch(() => {});
  }
  function duplicate(item: Prescription) {
    const copy = { ...item, id: undefined, clientId: nextOccurrenceKey(), series: item.series.map(row => ({ ...row })) };
    const next = [...items]; next.splice(items.indexOf(item) + 1, 0, copy);
    void apply(next, "duplicate").catch(() => {});
  }
  const menuBlock = blocks.find(block => block.id === menu?.block);
  const menuItem = items.find(item => exerciseKey(item) === menu?.item);
  const removeItems = items.filter(item => remove?.has(exerciseKey(item)));
  const openItemMenu = (key: string) => setMenu({ item: key });
  const itemHeader = (item: Prescription, handle?: ReactNode) => <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
    {change && handle}
    {change && <ExerciseCheckbox label={"Selecionar " + item.exercise?.name} checked={selected.has(exerciseKey(item))} disabled={disabled} toggle={() => toggleSelection([exerciseKey(item)])} />}
    <Pressable accessibilityRole="button" accessibilityLabel={"Detalhes de " + item.exercise?.name} aria-expanded={expanded.has(exerciseKey(item))} onPress={() => toggle(exerciseKey(item))} style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" }}><Label bold>{item.exercise?.name ?? "Exercício indisponível"}</Label></Pressable>
    {change && <Button label={"Ações de " + item.exercise?.name} disabled={disabled} variant="secondary" onPress={() => openItemMenu(exerciseKey(item))}>⋯</Button>}
  </View>;
  return <View style={{ gap: 10 }}>
    <View style={[{ gap: 10 }, destination && { display: "none" }]}>
    {selectedItems.length === 0 ? normalActions : change && <Card style={{ padding: 12, marginBottom: 0, backgroundColor: t.accentSoft }}>
      <Label bold>{selectedItems.length} exercício(s) selecionado(s)</Label>
      <View style={[s.row, { gap: 8, marginTop: 8 }]}>
        <Button label="Combinar selecionados" disabled={disabled || selectedItems.length < 2} onPress={combineSelection}>Combinar</Button>
        <Button label="Excluir selecionados" disabled={disabled} variant="danger" onPress={() => setRemove(new Set(selectedItems.map(exerciseKey)))}>Excluir</Button>
        {selectedItems.some(item => item.groupId) && <Button disabled={disabled} variant="secondary" onPress={() => void apply(detachSelectedExercises(items, new Set(selectedItems.map(exerciseKey))), "separate").catch(() => {})}>Separar selecionados</Button>}
        <Button disabled={disabled} variant="secondary" onPress={() => setSelected(new Set())}>Limpar seleção</Button>
      </View>
    </Card>}
    {!!ids.length && <View style={s.row}>
      {change && <View style={{ flexDirection: "row", alignItems: "center" }}><ExerciseCheckbox label="Selecionar todos os exercícios" checked={allSelected} mixed={selectedItems.length > 0 && !allSelected} disabled={disabled} toggle={() => setSelected(allSelected ? new Set() : new Set(items.map(exerciseKey)))} /><Label>Selecionar todos</Label></View>}
      <Button variant="secondary" onPress={() => setExpanded(all ? new Set() : new Set([...ids, ...items.map(exerciseKey)]))}>{all ? "Recolher todos" : "Expandir todos"}</Button>
    </View>}
    <SortableExercises ids={ids} labels={Object.fromEntries(blocks.map(block => [block.id, title(block)]))} disabled={disabled || !change} reorder={(from, to) => void reorder(from, to).catch(() => {})}>{(key, handle) => {
      const block = blocks.find(block => block.id === key)!;
      const name = title(block), open = expanded.has(key), index = ids.indexOf(key);
      const keys = block.items.map(exerciseKey), checked = keys.every(key => selected.has(key));
      return <Card style={{ padding: 10, marginBottom: 8, borderColor: keys.some(key => selected.has(key)) ? t.accent : t.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {change && handle}
          {change && <ExerciseCheckbox label={"Selecionar " + name} checked={checked} mixed={!checked && keys.some(key => selected.has(key))} disabled={disabled} toggle={() => toggleSelection(keys)} />}
          <Pressable accessibilityRole="button" accessibilityLabel={"Detalhes de " + name} aria-expanded={open} onPress={() => toggle(key)} style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" }}>
            {block.items.map(item => <Label key={exerciseKey(item)} bold>{item.exercise?.name ?? "Exercício indisponível"}</Label>)}
          </Pressable>
          {change && <Pressable accessibilityRole="button" accessibilityLabel={"Ações de " + name} disabled={disabled} onPress={() => block.groupId ? setMenu({ block: key }) : openItemMenu(keys[0])} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Label size={22}>⋯</Label></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel={(open ? "Recolher " : "Expandir ") + name} aria-expanded={open} onPress={() => toggle(key)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Label>{open ? "⌃" : "⌄"}</Label></Pressable>
        </View>
        <ExerciseExpansion open={open}>
          {block.groupId ? <>
            <Label muted>Grupo combinado · prescrições individuais</Label>
            {change && addToGroup && <Button disabled={disabled} variant="secondary" onPress={() => { setSelected(new Set()); addToGroup(block.groupId!); }}>Adicionar novo exercício ao grupo</Button>}
            <SortableExercises ids={keys} labels={Object.fromEntries(block.items.map(item => [exerciseKey(item), item.exercise?.name ?? "Exercício"]))} disabled={disabled || !change} reorder={(from, to) => void apply(reorderGroupExercises(items, block.groupId!, from, to), "order").catch(() => {})}>{(memberKey, memberHandle) => {
              const member = block.items.find(item => exerciseKey(item) === memberKey)!;
              return <View style={{ marginTop: 10, padding: 8, borderWidth: 1, borderRadius: 10, borderColor: t.border }}>
                {itemHeader(member, memberHandle)}
                <ExerciseExpansion open={expanded.has(memberKey)}>{details(member, items.indexOf(member))}</ExerciseExpansion>
              </View>;
            }}</SortableExercises>
          </> : details(block.items[0], items.indexOf(block.items[0]))}
          {change && <View style={s.row}>
            <Button label={"Subir exercício " + (index + 1)} disabled={disabled || index === 0} variant="secondary" onPress={() => void reorder(index, index - 1).catch(() => {})}>↑</Button>
            <Button label={"Descer exercício " + (index + 1)} disabled={disabled || index === blocks.length - 1} variant="secondary" onPress={() => void reorder(index, index + 1).catch(() => {})}>↓</Button>
          </View>}
        </ExerciseExpansion>
      </Card>;
    }}</SortableExercises>
    </View>
    {(menuBlock || menuItem) && <ActionMenu title={menuBlock ? "Ações do bloco" : "Ações do exercício"} onClose={() => setMenu(null)}>
      <View style={{ gap: 12 }}>
        {menuBlock && <>
          <Button disabled={disabled} variant="secondary" onPress={() => void apply(separateExercises(items, new Set([menuBlock.id])), "separate").catch(() => {})}>Separar exercícios</Button>
          <Button disabled={disabled} variant="secondary" onPress={() => { setDestination({ groupId: menuBlock.groupId! }); setMenu(null); }}>Adicionar exercício existente ao grupo</Button>
          {addToGroup && <Button disabled={disabled} variant="secondary" onPress={() => { setMenu(null); setSelected(new Set()); addToGroup(menuBlock.groupId!); }}>Adicionar novo exercício ao grupo</Button>}
          <Button disabled={disabled} variant="danger" onPress={() => { setRemove(new Set(menuBlock.items.map(exerciseKey))); setMenu(null); }}>Excluir bloco</Button>
        </>}
        {menuItem && <>
          {editItem && <Button disabled={disabled} variant="secondary" onPress={() => { setMenu(null); editItem(exerciseKey(menuItem)); }}>Editar exercício</Button>}
          <Button disabled={disabled || items.length >= 100} variant="secondary" onPress={() => duplicate(menuItem)}>Duplicar exercício</Button>
          <Button disabled={disabled} variant="secondary" onPress={() => { setSelected(current => new Set([...current, exerciseKey(menuItem)])); setMenu(null); }}>Combinar com outros exercícios</Button>
          {menuItem.groupId ? <Button disabled={disabled} variant="secondary" onPress={() => void apply(detachExercise(items, exerciseKey(menuItem)), "membership").catch(() => {})}>Remover do grupo</Button> : blocks.some(block => block.groupId) && <Button disabled={disabled} variant="secondary" onPress={() => { setDestination({ itemKey: exerciseKey(menuItem) }); setMenu(null); }}>Adicionar ao grupo</Button>}
          {itemMenu && ["Trocar exercício", "Adicionar preset", "Salvar como preset", "Adicionar exercício alternativo"].map(action => <Button key={action} disabled={disabled} variant="secondary" onPress={() => { setMenu(null); setSelected(new Set()); itemMenu(exerciseKey(menuItem), action); }}>{action}</Button>)}
          <Button disabled={disabled} variant="danger" onPress={() => { setRemove(new Set([exerciseKey(menuItem)])); setMenu(null); }}>Excluir</Button>
        </>}
      </View>
    </ActionMenu>}
    {destination && <WorkoutScreen title="Adicionar ao grupo" backLabel="Voltar ao treino" back={() => setDestination(null)}><View style={{ gap: 8 }}>
      {destination.itemKey ? blocks.filter(block => block.groupId).map(block => <Button key={block.id} disabled={disabled} variant="secondary" onPress={() => void apply(insertExerciseInGroup(items, items.find(item => exerciseKey(item) === destination.itemKey)!, block.groupId!), "membership").catch(() => {})}>{title(block)}</Button>) : items.filter(item => item.groupId !== destination.groupId).map(item => <Button key={exerciseKey(item)} disabled={disabled} variant="secondary" onPress={() => void apply(insertExerciseInGroup(items, item, destination.groupId!), "membership").catch(() => {})}>{item.exercise?.name}</Button>)}
      {!destination.itemKey && !items.some(item => item.groupId !== destination.groupId) && <Label>Todos os exercícios deste treino já estão no grupo. Use a biblioteca para adicionar um novo.</Label>}
    </View></WorkoutScreen>}
    {remove && <Confirm title="Excluir exercícios selecionados?" description={"Remover deste treino: " + removeItems.map(item => item.exercise?.name ?? "Exercício").join(", ") + ". Os exercícios da biblioteca serão preservados."} onClose={() => setRemove(null)} onConfirm={async () => { await apply(removeExercises(items, remove), "delete"); }} />}
  </View>;
}

function ActionMenu({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTheme();
  return <Modal transparent visible animationType="none" onRequestClose={onClose}>
    <Pressable accessibilityLabel="Fechar menu de ações" onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066", padding: 16, alignItems: "center", justifyContent: "center" }}>
      <Pressable onPress={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "90%", padding: 16, borderRadius: 18, backgroundColor: t.background }}>
        <ScrollView><Label bold>{title}</Label>{children}<Button variant="secondary" onPress={onClose}>Fechar menu</Button></ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
