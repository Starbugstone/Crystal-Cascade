import { expect, it, vi } from 'vitest';
import { Color, PerspectiveCamera, Scene } from 'three';
import { TownFrameCache } from '../src/game/town/TownFrameCache';

it('reuses scenery between animation frames, refreshing after camera/building changes or resize', () => {
  let width = 390;
  const renders = [],
    renderer = {
      autoClear: true,
      getDrawingBufferSize: (size) => size.set(width, 480),
      setRenderTarget: vi.fn(),
      render(scene, camera) {
        renders.push({ scene, layers: camera.layers.mask, clear: this.autoClear });
      },
    };
  const town = new Scene(),
    camera = new PerspectiveCamera();
  town.background = new Color('#e9e8da');
  const background = town.background,
    layers = camera.layers.mask;
  const cache = new TownFrameCache(renderer);
  cache.render(town, camera);
  cache.render(town, camera);
  expect(renders.filter((r) => r.scene === town && r.layers === 1)).toHaveLength(1);
  expect(renders.filter((r) => r.scene === town && r.layers === 4)).toHaveLength(2);
  expect(renders.filter((r) => r.layers === 4).every((r) => !r.clear)).toBe(true);
  expect(camera.layers.mask).toBe(layers);
  expect(town.background).toBe(background);
  expect(renderer.autoClear).toBe(true);
  cache.render(town, camera, true);
  width = 844;
  cache.render(town, camera);
  expect(renders.filter((r) => r.scene === town && r.layers === 1)).toHaveLength(3);
  expect(cache.target.width).toBe(844);
  expect(cache.material.uniforms.townDepth.value).toBe(cache.target.depthTexture);
  const dispose = vi.spyOn(cache.target, 'dispose');
  cache.dispose();
  expect(dispose).toHaveBeenCalledOnce();
});
