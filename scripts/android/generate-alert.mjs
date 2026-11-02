import fs from 'node:fs';
import path from 'node:path';
// Toque original de duas notas: PCM mono, com envelope para evitar estalos.
const rate=22050,duration=0.65,samples=Math.round(rate*duration),bytes=Buffer.alloc(44+samples*2);
bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);
bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++){
 const time=i/rate,note=time<0.24?0:time>=0.3?1:-1,start=note===1?0.3:0,length=note===1?0.35:0.24;
 const local=time-start,envelope=note<0?0:Math.max(0,Math.min(1,local/0.012,(length-local)/0.07));
 const frequency=note===1?1046.5:783.99;
 const value=0.42*envelope*(Math.sin(2*Math.PI*frequency*local)+0.15*Math.sin(4*Math.PI*frequency*local));
 bytes.writeInt16LE(Math.round(value*32767),44+i*2);
}
const output=path.resolve('native-android/app/src/main/res/raw/tapago_alert.wav');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
console.log('Toque Android gerado: '+bytes.length+' bytes.');
