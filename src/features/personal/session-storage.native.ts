import * as SecureStore from "expo-secure-store";
export function readSession() {
  return SecureStore.getItemAsync("tapago.personal.session");
}
export async function saveSession(token: string | null) {
  if (token) await SecureStore.setItemAsync("tapago.personal.session", token);
  else await SecureStore.deleteItemAsync("tapago.personal.session");
}
