import { afterEach, expect, it, vi } from 'vitest';
import { executionTotals, nextSet, undoSet } from '../../shared/workout-execution';
import { remainingRest } from '../../shared/rest-timer';
import type { Prescription } from '../../shared/workouts';
const item = (sets: number[], rests: number[] = []) => ({ series: sets.map((sets, i) => ({ sets, repetitions: '10', restSeconds: rests[i] ?? 60 })) }) as Prescription;
afterEach(() => vi.useRealTimers());
it('descansa após a última série se ainda há outro exercício, respeitando o intervalo da linha final', () => {
  expect(nextSet(item([2, 1], [30, 90]), [2, 0], true)).toMatchObject({ row: 1, next: [2, 1], restSeconds: 90 });
  expect(nextSet(item([1], [0]), [0], true)?.restSeconds).toBe(0);
  expect(nextSet(item([1], [90]), [0], false)?.restSeconds).toBe(0);
});
it.each([1, 3, 7, 12])('registra %i séries sem ultrapassar a prescrição e não descansa após a última', total => {
  const prescription = item([total]); let counts = [0];
  for (let i = 0; i < total; i++) { const step = nextSet(prescription, counts)!; counts = step.next; expect(step.restSeconds).toBe(i === total - 1 ? 0 : 60); }
  expect(counts).toEqual([total]); expect(nextSet(prescription, counts)).toBeNull();
});
it('respeita intervalos por linha, inclusive zero, e desfaz só a última série', () => {
  const prescription = item([2, 2], [0, 90]);
  expect(nextSet(prescription, [0, 0])).toMatchObject({ row: 0, next: [1, 0], restSeconds: 0 });
  expect(nextSet(prescription, [2, 0])).toMatchObject({ row: 1, next: [2, 1], restSeconds: 90 });
  expect(nextSet(prescription, [2, 1])).toMatchObject({ row: 1, next: [2, 2], restSeconds: 0 });
  expect(undoSet(prescription, [2, 1])).toEqual([2, 0]); expect(undoSet(prescription, [0, 0])).toBeNull();
  expect(prescription.series.map(r => r.sets)).toEqual([2, 2]);
});
it('calcula o progresso por séries registradas, mesmo com exercício incompleto', () => {
  const items = [item([3]), item([1, 2])];
  expect(executionTotals(items, i => i === items[0] ? [1] : [1, 1])).toEqual({ total: 6, done: 3, percent: 50 });
  expect(executionTotals([], () => [])).toEqual({ total: 0, done: 0, percent: 0 });
});
it('recalcula o prazo absoluto após suspensão e recarregamento sem contar outra série', () => {
  vi.useFakeTimers(); vi.setSystemTime(100000);
  const deadline = Date.now() + 90000, serialized = JSON.stringify({ deadline, completedSets: [1] });
  vi.setSystemTime(125001); const recovered = JSON.parse(serialized);
  expect(remainingRest(recovered.deadline, Date.now())).toBe(65);
  vi.setSystemTime(250000); expect(remainingRest(recovered.deadline, Date.now())).toBe(0); expect(recovered.completedSets).toEqual([1]);
});
