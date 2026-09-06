import { afterEach, describe, expect, it, vi } from 'vitest';
import { TownSoundscape, villageSounds } from '../src/game/audio/TownSoundscape';

afterEach(() => vi.useRealTimers());
it('matches the sound palette to the inhabitants, buildings, work, and raid', () => {
  expect(villageSounds({})).toEqual(['birds', 'mining']);
  expect(villageSounds({ population: 2, construction: true, stable: true })).toEqual([
    'birds',
    'mining',
    'chatter',
    'building',
    'horse',
    'hooves',
  ]);
  expect(villageSounds({ population: 20, construction: true, stable: true, raid: '1' })).toEqual([
    'hooves',
  ]);
});
describe('Quiet village audio lifecycle', () => {
  it('spaces cues, stops timers and voices when paused, obeys mute, and closes its context', async () => {
    vi.useFakeTimers();
    const parameter = () => ({
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    });
    const sources = [];
    const ctx = {
      state: 'running',
      currentTime: 0,
      destination: {},
      close: vi.fn().mockResolvedValue(),
      createGain: () => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }),
      createOscillator: () => {
        const source = {
          frequency: parameter(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        sources.push(source);
        return source;
      },
    };
    const audio = new TownSoundscape({ contextFactory: () => ctx, random: () => 0 });
    const life = vi.spyOn(audio, 'playLife');
    audio.update({ paused: false, musicVolume: 0.5, sfxVolume: 0.5 });
    expect(vi.getTimerCount()).toBe(0);
    await audio.unlock();
    expect(vi.getTimerCount()).toBe(2);
    vi.advanceTimersByTime(1800);
    expect(life).toHaveBeenCalledExactlyOnceWith('birds');
    vi.advanceTimersByTime(8999);
    expect(life).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(life).toHaveBeenLastCalledWith('mining');
    audio.update({ ...audio.state, paused: true });
    expect(vi.getTimerCount()).toBe(0);
    expect(sources.every((source) => source.stop.mock.calls.length >= 2)).toBe(true);
    audio.update({ ...audio.state, paused: false, musicVolume: 0, sfxVolume: 0 });
    const count = sources.length;
    vi.advanceTimersByTime(30000);
    expect(sources).toHaveLength(count);
    expect(life).toHaveBeenCalledTimes(2);
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(ctx.close).toHaveBeenCalledOnce();
  });
});
