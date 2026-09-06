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
it('destroys village audio synchronously on mine entry and recreates it only for a visible village', async () => {
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
  expect(first.dispose).toHaveBeenCalledOnce();
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
  expect(hooks.instances).toHaveLength(2);
  expect(hooks.instances[1]).not.toBe(first);
  village.active = false;
  expect(hooks.instances[1].dispose).toHaveBeenCalledOnce();
});
