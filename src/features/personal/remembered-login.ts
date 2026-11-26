// Na web, somente os e-mails são mantidos pelo app; a senha pertence ao gerenciador do navegador.
const key = "tapago.login.emails.v1";
export async function rememberedEmails(): Promise<string[]> {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))].slice(0, 5) : [];
  } catch { return []; }
}
export async function forgetLogin(email: string): Promise<void> {
  try { localStorage.setItem(key, JSON.stringify((await rememberedEmails()).filter(value => value !== email))); } catch {}
}
export async function rememberLogin(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  try { localStorage.setItem(key, JSON.stringify([normalized, ...(await rememberedEmails()).filter(value => value !== normalized)].slice(0, 5))); } catch {}
  type PasswordConstructor = new (data: { id: string; password: string }) => Credential;
  const Constructor = (globalThis as typeof globalThis & { PasswordCredential?: PasswordConstructor }).PasswordCredential;
  try { if (Constructor && navigator.credentials?.store) await navigator.credentials.store(new Constructor({ id: normalized, password })); } catch {}
}
export async function recalledPassword(email: string): Promise<string | null> {
  try {
    const options: CredentialRequestOptions & { password: boolean } = { password: true, mediation: "optional" };
    const credential = await navigator.credentials?.get(options);
    return credential?.type === "password" && credential.id.toLowerCase() === email.toLowerCase() && "password" in credential && typeof credential.password === "string" ? credential.password : null;
  } catch { return null; }
}
