import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { studentSchema } from "../../shared/validation";

it("aceita cadastro inicial sem acompanhamento ou dados de saúde", () => {
  const student = studentSchema.parse({ name: "Leo", startDate: "2026-11-26" });
  expect(student.mainGoal).toBe("");
  expect(student.injuries).toBe("");
  expect(student.weeklyFrequency).toBe(3);
  expect(studentSchema.safeParse({ name: "", startDate: "2026-11-26" }).success).toBe(false);
});

it("preserva informações de acompanhamento e saúde na edição", () => {
  const input = { name: "Leo", startDate: "2026-11-26", mainGoal: "Mobilidade", injuries: "Lesão informada", weeklyFrequency: 4 };
  expect(studentSchema.parse(input)).toMatchObject(input);
});

it("mantém o objetivo opcional também no contrato do backend PHP", () => {
  const contracts = JSON.parse(readFileSync("backend-php/generated/contracts.json", "utf8"));
  expect(contracts.studentSchema.required).not.toContain("mainGoal");
  expect(contracts.studentSchema.properties.mainGoal.default).toBe("");
});
