// Navegadores usam exclusivamente o cookie HttpOnly enviado pela API.
export async function readSession(): Promise<string | null> {
  return null;
}
export async function saveSession(_token: string | null): Promise<void> {}
