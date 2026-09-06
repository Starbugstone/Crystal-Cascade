import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Render opaque scenery together with vertex colors. Keep the original plot meshes
// on the picking layer, so a draw-call reduction never changes which building is hit.
export class TownStatics {
  constructor(scene) {
    this.scene = scene;
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  }
  rebuild(roots) {
    this.clear();
    const geometries = [];
    for (const root of roots) {
      root.updateWorldMatrix(true, true);
      root.traverse((object) => {
        if (
          !object.isMesh ||
          !object.material.isMeshStandardMaterial ||
          object.material.map ||
          object.material.transparent
        )
          return;
        const geometry = object.geometry.clone();
        geometry.applyMatrix4(object.matrixWorld);
        geometry.deleteAttribute('uv');
        const oldColors = geometry.getAttribute('color');
        const colors = new Float32Array(geometry.getAttribute('position').count * 3),
          color = object.material.color;
        for (let i = 0; i < colors.length / 3; i++) {
          colors[i * 3] = color.r * (oldColors?.getX(i) ?? 1);
          colors[i * 3 + 1] = color.g * (oldColors?.getY(i) ?? 1);
          colors[i * 3 + 2] = color.b * (oldColors?.getZ(i) ?? 1);
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        if (geometry.index) geometries.push(geometry);
        else {
          geometries.push(mergeVertices(geometry));
          geometry.dispose();
        }
        object.layers.set(1);
      });
    }
    if (!geometries.length) return;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    this.mesh = new THREE.Mesh(merged, this.material);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }
  clear() {
    if (!this.mesh) return;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh = null;
  }
  dispose() {
    this.clear();
    this.material.dispose();
  }
}
