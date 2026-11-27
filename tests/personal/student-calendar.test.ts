import { expect, it } from "vitest";
import { calendarCells, calendarMonthSchema, monthRange, shiftCalendarMonth } from "../../shared/student-calendar";

it("organiza meses por domingo, incluindo espaços e anos bissextos", () => {
  expect(calendarCells("2026-11").slice(0, 2)).toEqual(["2026-11-01", "2026-11-02"]);
  const leap = calendarCells("2028-02");
  expect(leap.slice(0, 3)).toEqual([null, null, "2028-02-01"]);
  expect(leap.filter(Boolean)).toHaveLength(29);
  expect(leap.length % 7).toBe(0);
  expect(monthRange("2027-02").end).toBe("2027-02-28");
});

it("navega entre anos e rejeita meses inválidos", () => {
  expect(shiftCalendarMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftCalendarMonth("2026-01", -1)).toBe("2025-12");
  for (const month of ["2026-13", "2026-00", "26-11", "2026-1", "2026-11-01", "0000-01"]) expect(calendarMonthSchema.safeParse(month).success).toBe(false);
});
