import { z } from "zod";

export const calendarMonthSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, "Mês inválido");
export type StudentCalendar = { month: string; days: { date: string; count: number }[]; total: number };

export function monthRange(month: string) {
  calendarMonthSchema.parse(month);
  const [year, value] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { start: month + "-01", end: month + "-" + String(last).padStart(2, "0") };
}

export function calendarCells(month: string) {
  const { start, end } = monthRange(month);
  const offset = new Date(start + "T12:00:00Z").getUTCDay();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= Number(end.slice(-2)); day++) cells.push(month + "-" + String(day).padStart(2, "0"));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftCalendarMonth(month: string, direction: -1 | 1) {
  calendarMonthSchema.parse(month);
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + direction, 1));
  return date.toISOString().slice(0, 7);
}
