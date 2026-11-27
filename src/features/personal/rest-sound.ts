import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export function prepareRestSound() {
  let player: AudioPlayer | null = null, closed = false;
  try {
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, allowsRecording: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    player = createAudioPlayer(require('../../../assets/audio/rest-alert.wav'));
  } catch { /* O contador, o anúncio visual e a vibração continuam disponíveis. */ }
  return {
    play() {
      if (!player || closed) return;
      const active = player;
      void active.seekTo(0).then(() => { if (!closed) active.play(); }).catch(() => {});
    },
    close() { closed = true; try { player?.remove(); } catch {} player = null; },
  };
}
