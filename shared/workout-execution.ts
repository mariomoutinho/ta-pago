import type { Prescription } from './workouts';
import { prescribedSets } from './workout-progress';
import { initialSeries } from './series';

export type ExecutionRest = { workoutId: string; revision: number; date: string; itemId: string; row: number; version: number; startedAt: number; deadline: number };
export function nextSet(item: Prescription, completed: number[]) {
  const totals = prescribedSets(item), row = totals.findIndex((total, i) => (completed[i] ?? 0) < total);
  if (row < 0) return null;
  const next = totals.map((total, i) => Math.min(total, Math.max(0, completed[i] ?? 0)));
  next[row]++;
  const remaining = totals.reduce((sum, total, i) => sum + total - next[i], 0);
  return { row, next, restSeconds: remaining ? Math.max(0, initialSeries(item)[row]?.restSeconds ?? 0) : 0 };
}
export function undoSet(item: Prescription, completed: number[]) {
  const next = prescribedSets(item).map((total, i) => Math.min(total, Math.max(0, completed[i] ?? 0)));
  const row = next.findLastIndex(value => value > 0);
  if (row < 0) return null;
  next[row]--;
  return next;
}
export function executionTotals(items: Prescription[], counts: (item: Prescription) => number[]) {
  const total = items.reduce((sum, item) => sum + prescribedSets(item).reduce((a, b) => a + b, 0), 0);
  const done = items.reduce((sum, item) => sum + prescribedSets(item).reduce((a, n, i) => a + Math.min(n, Math.max(0, counts(item)[i] ?? 0)), 0), 0);
  return { total, done, percent: total ? Math.round(done / total * 100) : 0 };
}
