/** Verifica dimensões e estrutura básica JPEG sem executar codecs no servidor. */
export function validWorkoutJpeg(bytes:Uint8Array):boolean {
  if(bytes.length<12||bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return false;
  for(let i=2;i+3<bytes.length;){
    if(bytes[i++]!==255)return false;while(bytes[i]===255)i++;const marker=bytes[i++];
    if(marker===0xda||marker===0xd9)return false;
    if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;
    const size=bytes[i]*256+bytes[i+1];if(size<2||i+size>bytes.length)return false;
    if([0xc0,0xc1,0xc2].includes(marker)){
      if(size<8)return false;const height=bytes[i+3]*256+bytes[i+4],width=bytes[i+5]*256+bytes[i+6];return width>0&&height>0&&width*height<=4000000;
    }i+=size;
  }return false;
}
