import * as DocumentPicker from 'expo-document-picker';
export async function pickWorkoutPhoto():Promise<string|null>{
  const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp'],multiple:false,base64:false});
  if(result.canceled)return null;const file=result.assets[0].file;
  if(!file||file.size>15*1024*1024)throw new Error('Escolha uma imagem de até 15 MB.');
  const image=await createImageBitmap(file);try{
    const canvas=document.createElement('canvas');let scale=Math.min(1,1280/Math.max(image.width,image.height)),quality=0.85;
    for(let attempt=0;attempt<12;attempt++){
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar a foto.');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const photo=canvas.toDataURL('image/jpeg',quality);if(photo.length<=350000)return photo;
      if(quality>0.5)quality-=0.15;else scale*=0.75;
    }throw new Error('Não foi possível reduzir a foto. Escolha outra imagem.');
  }finally{image.close();}
}
