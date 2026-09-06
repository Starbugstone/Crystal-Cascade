import { expect, it, vi } from 'vitest';
import { Color, PerspectiveCamera, Scene } from 'three';
import { TownDiorama } from '../src/game/town/TownDiorama';
import { TownFrameCache } from '../src/game/town/TownFrameCache';

it('keeps villagers and raid time moving while the camera owns the next draw', () => {
  const actor = {},
    scene = {
      cameraFrame: 1,
      lastFrame: 1000,
      elapsed: 0,
      actors: [actor],
      animatePerson: vi.fn(),
      motions: [vi.fn()],
      actorRenderer: { update: vi.fn() },
      frameCache: { render: vi.fn() },
    };
  TownDiorama.prototype.tick.call(scene, 1017);
  expect(scene.elapsed).toBeCloseTo(0.017);
  expect(scene.animatePerson).toHaveBeenCalledWith(actor, scene.elapsed);
  expect(scene.motions[0]).toHaveBeenCalledWith(scene.elapsed);
  expect(scene.frameCache.render).not.toHaveBeenCalled();
  scene.cameraFrame = 0;
  TownDiorama.prototype.tick.call(scene, 1034);
  expect(scene.frameCache.render).toHaveBeenCalledOnce();
});

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

it('refreshes a village returning at the same size without reallocating its drawing buffer', () => {
  const scene = {
    canvas: { clientWidth: 390, clientHeight: 844 },
    width: 390,
    height: 844,
    renderer: { setSize: vi.fn() },
    render: vi.fn(),
  };
  const resize = () => TownDiorama.prototype.resize.call(scene);
  resize();
  expect(scene.render).not.toHaveBeenCalled();
  scene.canvas.clientWidth = scene.canvas.clientHeight = 0;
  resize();
  expect(scene.render).not.toHaveBeenCalled();
  Object.assign(scene.canvas, { clientWidth: 390, clientHeight: 844 });
  resize();
  expect(scene.render).toHaveBeenCalledOnce();
  expect(scene.renderer.setSize).not.toHaveBeenCalled();
  resize();
  expect(scene.render).toHaveBeenCalledOnce();
});
