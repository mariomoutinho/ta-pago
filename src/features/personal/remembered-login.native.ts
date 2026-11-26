import * as SecureStore from "expo-secure-store";
const key = "tapago.login.emails.v1";
const credentialKey = (email: string) => "tapago.login.account." + Array.from(email).map(character => character.codePointAt(0)!.toString(16)).join("-");
export async function rememberedEmails(): Promise<string[]> {
  try {
    const values: unknown = JSON.parse(await SecureStore.getItemAsync(key) ?? "[]");
    return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))].slice(0, 5) : [];
  } catch { return []; }
}
export async function forgetLogin(email: string): Promise<void> {
  await SecureStore.deleteItemAsync(credentialKey(email));
  await SecureStore.setItemAsync(key, JSON.stringify((await rememberedEmails()).filter(value => value !== email)));
}
export async function rememberLogin(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const previous = await rememberedEmails();
  const next = [normalized, ...previous.filter(value => value !== normalized)].slice(0, 5);
  await SecureStore.setItemAsync(credentialKey(normalized), password, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  await SecureStore.setItemAsync(key, JSON.stringify(next));
  for (const removed of previous.filter(value => !next.includes(value))) await SecureStore.deleteItemAsync(credentialKey(removed));
}
export function recalledPassword(email: string): Promise<string | null> { return SecureStore.getItemAsync(credentialKey(email)); }
