import { expect, it } from "vitest";
import { dateInputToIso, formatDateInput, formatPhoneInput } from "../../src/features/personal/input-format";
import { dateSchema, studentSchema } from "../../shared/validation";

it("exibe datas ISO existentes em português sem alterar dia ou mês", () => {
  expect(formatDateInput("1990-08-25")).toBe("25/08/1990");
  expect(dateInputToIso("25/08/1990")).toBe("1990-08-25");
  expect(dateInputToIso("1990-08-25")).toBe("1990-08-25");
});
it("aceita digitação progressiva, colagem e limpeza sem completar datas parciais", () => {
  expect(["", "2", "25", "250", "2508", "25081990"].map(formatDateInput)).toEqual(["", "2", "25", "25/0", "25/08", "25/08/1990"]);
  expect(dateSchema.safeParse(dateInputToIso("25/08/199")).success).toBe(false);
  expect(dateInputToIso("")).toBe("");
});
it("preserva a validação de calendário e ano bissexto sem normalizar datas impossíveis", () => {
  expect(dateSchema.safeParse(dateInputToIso("29/02/2000")).success).toBe(true);
  for (const date of ["29/02/2001", "31/02/2000", "01/13/2000", "00/01/2000"])
    expect(dateSchema.safeParse(dateInputToIso(date)).success).toBe(false);
});
it("mantém contrato de persistência e data opcional vazia", () => {
  const data = studentSchema.parse({ name: "Aluno Sintético", mainGoal: "Mobilidade", startDate: dateInputToIso("01/11/2026"), birthDate: dateInputToIso(""), phone: formatPhoneInput("11912345678") });
  expect(data.startDate).toBe("2026-11-01");
  expect(data.birthDate).toBeNull();
  expect(data.phone).toBe("(11) 9 1234 5678");
});
it("formata celular, telefone fixo e colagem com código brasileiro", () => {
  expect(formatPhoneInput("11912345678")).toBe("(11) 9 1234 5678");
  expect(formatPhoneInput("1132345678")).toBe("(11) 3234 5678");
  expect(formatPhoneInput("+55 (11) 91234-5678")).toBe("(11) 9 1234 5678");
  expect(formatPhoneInput("(11) 9 1234 5678")).toBe("(11) 9 1234 5678");
  expect(formatPhoneInput("")).toBe("");
});
it("limita a nova digitação a DDD e nove dígitos sem truncar números legados na exibição", () => {
  expect(formatPhoneInput("119123456789", true)).toBe("(11) 9 1234 5678");
  expect(formatPhoneInput("+44 20 7946 0958")).toBe("+44 20 7946 0958");
});
