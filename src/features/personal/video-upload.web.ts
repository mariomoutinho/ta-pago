import * as DocumentPicker from "expo-document-picker";
import { apiBase } from "./api";
export const pickVideo = () => DocumentPicker.getDocumentAsync({ type: "video/mp4", multiple: false, base64: false });
export async function uploadVideo(asset: DocumentPicker.DocumentPickerAsset, progress: (value: number) => void): Promise<string> {
  if (!asset.file) throw new Error("Selecione o vídeo novamente.");
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", `${apiBase()}/api/exercise-videos`);
    request.withCredentials = true;
    request.timeout = 180000;
    request.setRequestHeader("Content-Type", "video/mp4");
    request.setRequestHeader("X-Requested-With", "TaPago");
    request.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("O envio falhou. Verifique sua conexão e tente novamente."));
    request.ontimeout = () => reject(new Error("O envio demorou demais. Tente novamente em uma conexão mais rápida."));
    request.onload = () => {
      try {
        const response = JSON.parse(request.responseText);
        if (request.status !== 201 || typeof response.url !== "string") throw new Error(response.error ?? "Não foi possível enviar o vídeo.");
        resolve(response.url);
      } catch (error) { reject(error instanceof SyntaxError ? new Error("Não foi possível enviar o vídeo. Tente um arquivo menor.") : error); }
    };
    request.send(asset.file);
  });
}
