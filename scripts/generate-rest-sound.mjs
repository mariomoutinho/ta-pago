// Alerta original sintetizado: três tons de 880 Hz, sem áudio de terceiros.
import { mkdirSync, writeFileSync } from 'node:fs';
const rate = 22050, samples = Math.round(rate * 0.72), data = Buffer.alloc(44 + samples * 2);
data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) {
  const time = i / rate, offset = [0, 0.25, 0.5].find(start => time >= start && time < start + 0.2);
  const age = offset === undefined ? null : time - offset;
  const wave = age === null ? 0 : Math.sin(2 * Math.PI * 880 * age) * 0.18 * Math.min(1, age / 0.005) * Math.exp(-25 * age);
  data.writeInt16LE(Math.round(wave * 32767), 44 + i * 2);
}
mkdirSync('assets/audio', { recursive: true }); writeFileSync('assets/audio/rest-alert.wav', data);
