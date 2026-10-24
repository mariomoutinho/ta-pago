type GroupItem = { id?: string; clientId?: string; groupId?: string | null };
export const exerciseKey = (item: GroupItem) => item.id ?? item.clientId!;

export function canPersistExerciseOrder(previous: GroupItem[] | undefined, next: GroupItem[]) {
  return !!previous && previous.length === next.length && next.every(item => previous.some(old =>
    exerciseKey(old) === exerciseKey(item) && (old.groupId ?? null) === (item.groupId ?? null)));
}

/** Um bloco mantém as prescrições individuais na ordem em que serão executadas. */
export function exerciseBlocks<T extends GroupItem>(items: T[]) {
  const blocks: { id: string; groupId: string | null; items: T[] }[] = [];
  for (const item of items) {
    const previous = blocks.at(-1);
    if (item.groupId && previous?.groupId === item.groupId) previous.items.push(item);
    else blocks.push({ id: item.groupId ? `group:${item.groupId}` : exerciseKey(item), groupId: item.groupId ?? null, items: [item] });
  }
  return blocks;
}

export function validExerciseGroups(items: GroupItem[]) {
  const seen = new Set<string>();
  for (const block of exerciseBlocks(items)) {
    if (!block.groupId) continue;
    if (block.items.length < 2 || seen.has(block.groupId)) return false;
    seen.add(block.groupId);
  }
  return true;
}

export function combineExercises<T extends GroupItem>(items: T[], selected: Set<string>, groupId: string): T[] {
  const blocks = exerciseBlocks(items);
  const chosen = blocks.filter(block => selected.has(block.id));
  if (chosen.length < 2) return items;
  const combined = chosen.flatMap(block => block.items.map(item => ({ ...item, groupId })));
  let inserted = false;
  return blocks.flatMap(block => {
    if (!selected.has(block.id)) return block.items;
    if (inserted) return [];
    inserted = true;
    return combined;
  });
}

export function separateExercises<T extends GroupItem>(items: T[], selected: Set<string>): T[] {
  return exerciseBlocks(items).flatMap(block => selected.has(block.id) ? block.items.map(item => ({ ...item, groupId: null })) : block.items);
}

/** Remover um membro de um par também desfaz o bloco que ficou com um único item. */
export function removeExercises<T extends GroupItem>(items: T[], keys: Set<string>): T[] {
  const remaining = items.filter(item => !keys.has(exerciseKey(item)));
  return exerciseBlocks(remaining).flatMap(block => block.groupId && block.items.length === 1 ? block.items.map(item => ({ ...item, groupId: null })) : block.items);
}
