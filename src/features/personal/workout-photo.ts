import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
export async function pickWorkoutPhoto():Promise<string|null>{
  const result=await DocumentPicker.getDocumentAsync({type:'image/jpeg',multiple:false,copyToCacheDirectory:true});
  if(result.canceled)return null;const photo='data:image/jpeg;base64,'+await new File(result.assets[0].uri).base64();
  if(photo.length>350000)throw new Error('Escolha uma foto JPEG de até 250 KB.');return photo;
}
