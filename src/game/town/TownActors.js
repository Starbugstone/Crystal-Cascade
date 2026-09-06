import { Group, InstancedMesh, MeshStandardMaterial } from 'three';

// Keep articulated joints in the scene graph, but draw matching parts together.
// This lets a busy town share one draw call for all matching boots, hats or limbs.
export class TownActors {
  constructor(scene) {
    this.group = new Group();
    this.group.name = 'Instanced townspeople';
    scene.add(this.group);
    this.buckets = [];
    this.roots = [];
    this.material = new MeshStandardMaterial({ roughness: 0.88 });
  }
  rebuild(roots) {
    this.clear();
    this.roots = roots;
    const buckets = new Map();
    for (const root of roots)
      root.traverse((object) => {
        if (!object.isMesh) return;
        object.layers.set(1); // The camera draws their instances on layer two.
        const key = `${object.geometry.uuid}:${object.material.isMeshStandardMaterial ? 'colored' : object.material.uuid}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(object);
      });
    for (const objects of buckets.values()) {
      const first = objects[0];
      const colored = first.material.isMeshStandardMaterial;
      const mesh = new InstancedMesh(
        first.geometry,
        colored ? this.material : first.material,
        objects.length,
      );
      mesh.layers.set(2); // Animated foreground, over the cached town color/depth.
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.buckets.push({ mesh, objects, colored });
    }
    this.update();
  }
  update() {
    for (const root of this.roots) root.updateWorldMatrix(true, true);
    for (const { mesh, objects, colored } of this.buckets) {
      let count = 0;
      for (const object of objects) {
        let visible = true;
        for (let ancestor = object; ancestor; ancestor = ancestor.parent) {
          if (!ancestor.visible) {
            visible = false;
            break;
          }
        }
        if (visible) {
          mesh.setMatrixAt(count, object.matrixWorld);
          if (colored) mesh.setColorAt(count, object.material.color);
          count++;
        }
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  clear() {
    for (const { mesh } of this.buckets) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    this.buckets = [];
    this.roots = [];
  }
  dispose() {
    this.clear();
    this.group.removeFromParent();
    this.material.dispose();
  }
}
