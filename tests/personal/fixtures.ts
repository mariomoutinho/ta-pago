import type { APIRequestContext } from "@playwright/test";
import { createApp } from "../../server/app";
import type { Db } from "../../server/db";
import { hashPassword } from "../../server/security";

// Contas sintéticas são provisionadas no banco de teste; nunca pelo cadastro público.
const authorizedPersonalIds: string[] = [];
export function createTestApp(db: Db) {
  return createApp(db, { authorizedPersonalIds });
}
type Account = { name: string; email: string; password: string };
export async function authorizeFixturePersonal(db: Db, id: string) {
  await db.user.update({ where: { id }, data: { role: "personal" } });
  authorizedPersonalIds.push(id);
}
export async function provisionPersonal(db: Db, account: Account) {
  const { password, ...data } = account;
  const user = await db.user.create({
    data: { ...data, role: "personal", passwordHash: await hashPassword(password) },
  });
  authorizedPersonalIds.push(user.id);
  return user;
}
export async function provisionBrowserPersonal(
  db: Db,
  client: APIRequestContext,
  base: string,
  options: { headers?: Record<string, string>; data: Account & { role: string } },
) {
  await provisionPersonal(db, options.data);
  return client.post(base + "/api/auth/login", {
    headers: options.headers,
    data: { email: options.data.email, password: options.data.password },
  });
}
