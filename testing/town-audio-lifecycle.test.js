import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, reactive } from 'vue';
import { useGameStore } from '../src/stores/gameStore';
import { useTownAudio } from '../src/composables/useTownAudio';

const hooks = vi.hoisted(() => ({ mounted: [], unmounted: [], instances: [] }));
vi.mock('vue', async (original) => ({
  ...(await original()),
  onMounted: (callback) => hooks.mounted.push(callback),
  onBeforeUnmount: (callback) => hooks.unmounted.push(callback),
}));
vi.mock('../src/game/audio/TownSoundscape', () => ({
  TownSoundscape: class {
    constructor() {
      this.state = { paused: true };
      this.unlock = vi.fn();
      this.dispose = vi.fn();
      hooks.instances.push(this);
    }
    update(state) {
      this.state = state;
    }
  },
}));
let scope;
afterEach(() => {
  hooks.unmounted.forEach((callback) => callback());
  scope?.stop();
  hooks.mounted.length = hooks.unmounted.length = hooks.instances.length = 0;
  vi.unstubAllGlobals();
});
it('silences retained village audio synchronously on mine entry and reuses it on return', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('document', new EventTarget());
  setActivePinia(createPinia());
  const game = useGameStore();
  const village = reactive({ active: false, paused: false });
  scope = effectScope();
  scope.run(() => useTownAudio(() => ({ ...village })));
  hooks.mounted.forEach((callback) => callback());
  expect(hooks.instances).toHaveLength(0);
  village.active = true;
  await nextTick();
  const first = hooks.instances[0];
  expect(first.unlock).toHaveBeenCalled();
  game.sessionActive = true;
  expect(first.state.paused).toBe(true);
  expect(first.dispose).not.toHaveBeenCalled();
  document.dispatchEvent(new Event('pointerdown'));
  document.dispatchEvent(new Event('keydown'));
  await nextTick();
  expect(hooks.instances).toHaveLength(1);
  village.active = false;
  game.sessionActive = false;
  await nextTick();
  expect(hooks.instances).toHaveLength(1);
  village.active = true;
  await nextTick();
  expect(hooks.instances).toHaveLength(1);
  expect(first.state.paused).toBe(false);
  village.active = false;
  expect(first.state.paused).toBe(true);
  expect(first.dispose).not.toHaveBeenCalled();
  hooks.unmounted.splice(0).forEach((callback) => callback());
  expect(first.dispose).toHaveBeenCalledOnce();
});
