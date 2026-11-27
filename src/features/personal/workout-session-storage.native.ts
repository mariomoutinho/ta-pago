import * as SecureStore from 'expo-secure-store';
export const readWorkoutSession = (key: string) => SecureStore.getItemAsync(key);
export async function writeWorkoutSession(key: string, value: string | null) {
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
