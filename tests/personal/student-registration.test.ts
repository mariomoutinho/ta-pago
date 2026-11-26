import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { studentSchema, studentCreateSchema } from "../../shared/validation";
import { internationalPhone, registrationGroups } from "../../src/features/personal/student-registration";

it("aceita cadastro inicial sem acompanhamento ou dados de saúde", () => {
  const student = studentSchema.parse({ name: "Leo", startDate: "2026-11-26" });
  expect(student.mainGoal).toBe("");
  expect(student.injuries).toBe("");
  expect(student.weeklyFrequency).toBe(3);
  expect(studentSchema.safeParse({ name: "", startDate: "2026-11-26" }).success).toBe(false);
});

it("valida os contatos antes de criar convite de acesso", () => {
  const base = { name: "Leo", startDate: "2026-11-26", sendAccess: true };
  expect(studentCreateSchema.safeParse(base).success).toBe(false);
  expect(studentCreateSchema.safeParse({ ...base, email: "leo@example.test", phone: "+55" }).success).toBe(false);
  expect(studentCreateSchema.parse({ ...base, email: "leo@example.test", phone: "+5511999990000", trainingGroup: "Online" }).sendAccess).toBe(true);
});

it("mantém o DDI ao editar o telefone e oferece grupos padrão e personalizados", () => {
  expect(internationalPhone("+55 (11) 99999-0000", "55")).toBe("+5511999990000");
  expect(internationalPhone("+5", "55")).toBe("+55");
  expect(internationalPhone("", "55")).toBe("+55");
  expect(internationalPhone("+351 912 345 678", "351")).toBe("+351912345678");
  expect(registrationGroups(["Presencial", "Turma A", "Online", ""])).toEqual(["Presencial", "Online", "Turma A"]);
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
