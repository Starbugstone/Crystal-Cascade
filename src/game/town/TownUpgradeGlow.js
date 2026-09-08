import { BoxGeometry, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

// Two simple surfaces per plot, cached with the town. Normal depth testing lets
// walls and neighboring buildings hide the glow; no overlay particles or bloom.
export class TownUpgradeGlow {
  constructor(scene) {
    this.root = new Group();
    scene.add(this.root);
    this.box = new BoxGeometry(1, 1, 1);
    // Keep only vertical faces and merge them into one draw call.
    const sides = this.box.groups.filter(({ materialIndex }) => ![2, 3].includes(materialIndex));
    this.box.setIndex(
      sides.flatMap(({ start, count }) =>
        Array.from(this.box.index.array.slice(start, start + count)),
      ),
    );
    this.box.clearGroups();
    this.plane = new PlaneGeometry(1, 1);
    const vertexShader = `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    this.halo = new ShaderMaterial({
      vertexShader,
      fragmentShader: `varying vec2 vUv;
        void main() {
          float edge = max(abs(vUv.x - .5), abs(vUv.y - .5)) * 2.0;
          float alpha = (1.0 - smoothstep(.55, 1.0, edge)) * .95;
          gl_FragColor = vec4(.10, 1.0, .18, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.aura = new ShaderMaterial({
      vertexShader,
      fragmentShader: `varying vec2 vUv;
        void main() {
          float alpha = pow(1.0 - vUv.y, 2.0) * .82;
          gl_FragColor = vec4(.15, 1.0, .25, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.plots = new Map();
  }
  clear() {
    this.root.clear();
    this.plots.clear();
  }
  add(id, bounds) {
    const group = new Group();
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const height = Math.max(0.6, (bounds.max.y - bounds.min.y) * 0.45);
    group.position.set(
      (bounds.min.x + bounds.max.x) / 2,
      bounds.min.y + 0.15,
      (bounds.min.z + bounds.max.z) / 2,
    );
    const halo = new Mesh(this.plane, this.halo);
    halo.rotation.x = -Math.PI / 2;
    halo.scale.set(width + 1.8, depth + 1.8, 1);
    const aura = new Mesh(this.box, this.aura);
    // Hide horizontal faces: only the fading sides surround the lower building.
    aura.scale.set(width + 0.25, height, depth + 0.25);
    aura.position.y = height / 2;
    group.add(halo, aura);
    group.visible = false;
    this.root.add(group);
    this.plots.set(id, group);
  }
  setAvailable(ids) {
    const active = new Set(ids);
    let changed = false;
    for (const [id, group] of this.plots) {
      const visible = active.has(id);
      changed ||= group.visible !== visible;
      group.visible = visible;
    }
    return changed;
  }
  dispose() {
    this.clear();
    this.root.removeFromParent();
    this.box.dispose();
    this.plane.dispose();
    this.halo.dispose();
    this.aura.dispose();
  }
}
