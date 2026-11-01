import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { apiBase } from "./api";
import { readSession } from "./session-storage";
export const pickVideo = () => DocumentPicker.getDocumentAsync({ type: "video/mp4", multiple: false, copyToCacheDirectory: true });
export async function uploadVideo(asset: DocumentPicker.DocumentPickerAsset, progress: (value: number) => void): Promise<string> {
  const session = await readSession();
  const response = await fetch(`${apiBase()}/api/exercise-videos`, {
    method: "PUT", headers: { "Content-Type": "video/mp4", "X-Requested-With": "TaPago", ...(session ? { Authorization: `Bearer ${session}` } : {}) },
    body: new File(asset.uri),
  });
  const data = await response.json();
  if (response.status !== 201 || typeof data.url !== "string") throw new Error(data.error ?? "Não foi possível enviar o vídeo.");
  progress(100); return data.url;
}
