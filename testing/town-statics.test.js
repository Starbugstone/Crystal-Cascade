import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Scene, Vector3 } from 'three';
import { TownStatics } from '../src/game/town/TownStatics';
import { TownActors } from '../src/game/town/TownActors';

describe('Batching a growing village without losing color or interaction', () => {
  it('combines colored scenery while retaining original geometry for plot picking', () => {
    const scene = new Scene(),
      plot = new Group();
    plot.userData.plot = 'home';
    scene.add(plot);
    const geometry = new BoxGeometry(),
      originalDispose = vi.spyOn(geometry, 'dispose');
    const red = new MeshStandardMaterial({ color: '#c59376' }),
      green = new MeshStandardMaterial({ color: '#658580' });
    const front = new Mesh(geometry, red),
      roof = new Mesh(geometry, green);
    roof.position.y = 2;
    plot.add(front, roof);
    const renderer = new TownStatics(scene);
    renderer.rebuild([plot]);
    const colors = renderer.mesh.geometry.getAttribute('color');
    expect(colors.getX(0)).toBeCloseTo(red.color.r, 5);
    expect(colors.getX(colors.count - 1)).toBeCloseTo(green.color.r, 5);
    const raycaster = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    raycaster.layers.enable(1);
    expect(raycaster.intersectObjects([plot], true)[0].object).toBe(front);
    const dispose = vi.spyOn(renderer.mesh.geometry, 'dispose');
    renderer.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(originalDispose).not.toHaveBeenCalled();
  });
  it('shares one actor batch across different clothing colors and keeps the visible color after repacking', () => {
    const scene = new Scene(),
      root = new Group(),
      geometry = new BoxGeometry();
    scene.add(root);
    const first = new Mesh(geometry, new MeshStandardMaterial({ color: '#cc3322' }));
    const second = new Mesh(geometry, new MeshStandardMaterial({ color: '#3366aa' }));
    root.add(first, second);
    const renderer = new TownActors(scene);
    renderer.rebuild([root]);
    expect(renderer.buckets).toHaveLength(1);
    expect(renderer.buckets[0].mesh.instanceColor.getX(0)).toBeCloseTo(first.material.color.r, 5);
    first.visible = false;
    renderer.update();
    expect(renderer.buckets[0].mesh.count).toBe(1);
    expect(renderer.buckets[0].mesh.instanceColor.getZ(0)).toBeCloseTo(second.material.color.b, 5);
    renderer.dispose();
  });
});
