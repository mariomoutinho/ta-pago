export async function readWorkoutSession(key: string): Promise<string | null> {
  try { return localStorage.getItem(key); } catch { return null; }
}
export async function writeWorkoutSession(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* O progresso continua salvo no servidor. */ }
}
