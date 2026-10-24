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
  const keys = new Set(blocks.flatMap(block => selected.has(block.id) ? block.items.map(exerciseKey) : block.items.filter(item => selected.has(exerciseKey(item))).map(exerciseKey)));
  const chosen = items.filter(item => keys.has(exerciseKey(item)));
  if (chosen.length < 2) return items;
  const next = removeExercises(items, keys);
  let position = items.slice(0, items.indexOf(chosen[0])).filter(item => !keys.has(exerciseKey(item))).length;
  // Uma seleção parcial não pode partir o bloco restante ao meio.
  while (position > 0 && next[position]?.groupId && next[position]?.groupId === next[position - 1]?.groupId) position--;
  next.splice(position, 0, ...chosen.map(item => ({ ...item, groupId })));
  return next;
}

export function separateExercises<T extends GroupItem>(items: T[], selected: Set<string>): T[] {
  return exerciseBlocks(items).flatMap(block => selected.has(block.id) ? block.items.map(item => ({ ...item, groupId: null })) : block.items);
}

/** Remover um membro de um par também desfaz o bloco que ficou com um único item. */
export function removeExercises<T extends GroupItem>(items: T[], keys: Set<string>): T[] {
  const remaining = items.filter(item => !keys.has(exerciseKey(item)));
  return exerciseBlocks(remaining).flatMap(block => block.groupId && block.items.length === 1 ? block.items.map(item => ({ ...item, groupId: null })) : block.items);
}

export function reorderGroupExercises<T extends GroupItem>(items: T[], groupId: string, from: number, to: number): T[] {
  const members = items.filter(item => item.groupId === groupId);
  if (from === to || from < 0 || to < 0 || from >= members.length || to >= members.length) return items;
  const [item] = members.splice(from, 1);
  members.splice(to, 0, item);
  let index = 0;
  return items.map(item => item.groupId === groupId ? members[index++] : item);
}

export function detachExercise<T extends GroupItem>(items: T[], key: string): T[] {
  const item = items.find(item => exerciseKey(item) === key);
  if (!item?.groupId) return items;
  const members = items.filter(member => member.groupId === item.groupId);
  if (members.length === 2) return items.map(member => member.groupId === item.groupId ? { ...member, groupId: null } : member);
  const next = removeExercises(items, new Set([key]));
  const end = next.map(member => member.groupId).lastIndexOf(item.groupId);
  next.splice(end + 1, 0, { ...item, groupId: null });
  return next;
}

export function detachSelectedExercises<T extends GroupItem>(items: T[], keys: Set<string>): T[] {
  return exerciseBlocks(items).flatMap(block => {
    const chosen = block.items.filter(item => keys.has(exerciseKey(item)));
    if (!block.groupId || chosen.length === 0) return block.items;
    if (chosen.length === block.items.length) return block.items.map(item => ({ ...item, groupId: null }));
    const remaining = block.items.filter(item => !keys.has(exerciseKey(item)));
    return [...remaining.map(item => ({ ...item, groupId: remaining.length > 1 ? block.groupId : null })), ...chosen.map(item => ({ ...item, groupId: null }))];
  });
}

export function insertExerciseInGroup<T extends GroupItem>(items: T[], item: T, groupId: string): T[] {
  if (!items.some(member => member.groupId === groupId)) throw new Error("O grupo não está mais disponível.");
  if (items.some(member => exerciseKey(member) === exerciseKey(item) && member.groupId === groupId)) return items;
  const next = removeExercises(items, new Set([exerciseKey(item)]));
  const end = next.map(member => member.groupId).lastIndexOf(groupId);
  next.splice(end + 1, 0, { ...item, groupId });
  return next;
}
