export function remainingRest(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function formatRest(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
