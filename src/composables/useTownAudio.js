import { onMounted, onBeforeUnmount, watch } from 'vue';
import { TownSoundscape } from '../game/audio/TownSoundscape';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';

export function useTownAudio(readVillage) {
  const settings = useSettingsStore();
  const game = useGameStore();
  let soundscape;
  const stop = () => {
    soundscape?.dispose();
    soundscape = null;
  };
  const update = () => {
    const village = readVillage();
    if (!village.active || game.sessionActive) {
      // Keep decoded village audio alongside the retained diorama across mine visits.
      // Pausing stops voices and invalidates pending playback; unmount still disposes it.
      soundscape?.update({ ...soundscape.state, paused: true });
      return;
    }
    const created = !soundscape;
    soundscape ??= new TownSoundscape();
    soundscape.update({
      ...village,
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
    });
    if (created && !village.paused) soundscape.unlock();
  };
  const unlock = () => {
    update();
    if (soundscape && !soundscape.state.paused) soundscape.unlock();
  };
  watch(() => [JSON.stringify(readVillage()), settings.musicVolume, settings.sfxVolume], update, {
    immediate: true,
  });
  // Silence the village before synchronous mine setup or another pointer gesture can run.
  watch(() => [game.sessionActive, readVillage().active], update, { flush: 'sync' });
  onMounted(() => {
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    // Entering the village normally follows a user gesture; retry on later gestures if needed.
    unlock();
  });
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    stop();
  });
  return {
    playRaidCue(cue) {
      update();
      return soundscape?.playRaidCue(cue);
    },
  };
}
