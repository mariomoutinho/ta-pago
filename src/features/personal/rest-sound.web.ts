export function prepareRestSound() {
  let audio: AudioContext | undefined;
  try { audio = new AudioContext(); void audio.resume().catch(() => {}); } catch { /* Alerta visual permanece disponível. */ }
  return {
    play() {
      if (!audio || audio.state !== 'running') return;
      for (const offset of [0, 0.25, 0.5]) {
        const tone = audio.createOscillator(), volume = audio.createGain();
        tone.frequency.value = 880; volume.gain.setValueAtTime(0.18, audio.currentTime + offset);
        volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.2);
        tone.connect(volume); volume.connect(audio.destination);
        tone.start(audio.currentTime + offset); tone.stop(audio.currentTime + offset + 0.2);
      }
    },
    close() { if (audio && audio.state !== 'closed') void audio.close().catch(() => {}); },
  };
}
