import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLandscape, keepCameraAboveTerrain } from './TownLandscape';

export const PLOTS = {
  home: [-4.15, -3.0],
  farm: [4.05, -3.0],
  well: [0, -0.2],
  saloon: [-4.15, 2.2],
  stable: [4.15, 2.2],
  sheriff: [0, 4.6],
  mine: [0, -6.2],
};
const colors = {
  sand: '#c8ad7a',
  wood: '#9c7048',
  dark: '#514738',
  trim: '#e8d3a7',
  roof: '#638783',
};
const point = (x, y, z) => new THREE.Vector3(x, y, z);

// All town models are original geometry. Static meshes are merged by material;
// the small articulated cast stays separate so its joints can move naturally.
export class TownDiorama {
  constructor(canvas, onSelect, onLabels) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onLabels = onLabels;
    this.materials = new Map();
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      rounded: new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
      sphere: new THREE.SphereGeometry(1, 12, 8),
      rock: new THREE.IcosahedronGeometry(1, 0),
      foliage: new THREE.IcosahedronGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone: new THREE.CylinderGeometry(0.6, 1, 1, 10),
      shadow: new THREE.CircleGeometry(1, 24),
    };
    const leaves = this.geometries.foliage.attributes.position;
    for (let i = 0; i < leaves.count; i++) {
      const x = leaves.getX(i),
        y = leaves.getY(i),
        z = leaves.getZ(i);
      const variation = 1 + Math.sin(x * 19 + y * 11 + z * 7) * 0.12;
      leaves.setXYZ(i, x * variation, y * variation, z * variation);
    }
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e9e8da');
    this.scene.fog = new THREE.Fog('#e9e8da', 52, 125);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
    this.camera.position.set(12, 12, 25);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.contactShadowMaterial = new THREE.MeshBasicMaterial({
      color: '#51432d',
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene.add(new THREE.HemisphereLight('#e1eff7', '#ba9460', 2.1));
    const sun = new THREE.DirectionalLight('#ffe3ad', 3.5);
    sun.position.set(-24, 38, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 1,
      far: 95,
    });
    sun.shadow.normalBias = 0.025;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
    this.sun = sun;
    this.scene.add(new THREE.DirectionalLight('#cde5e7', 0.65));
    this.raycaster = new THREE.Raycaster();
    this.elapsed = 0;
    this.lastFrame = 0;
    this.landscape = buildLandscape(this);
    this.scene.add(this.landscape);
    this.controls = new OrbitControls(this.camera, canvas.parentElement);
    this.controls.cursorStyle = 'grab';
    this.controls.target.set(0, 0.7, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minDistance = 13;
    this.controls.maxDistance = 55;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.24;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.85;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.controls.update();
    this.controls.saveState();
    this.cameraChanged = () => {
      if (keepCameraAboveTerrain(this.camera.position, this.controls.target))
        this.controls.update();
      this.render();
    };
    this.controls.addEventListener('change', this.cameraChanged);
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.resize();
  }
  material(color) {
    if (!this.materials.has(color))
      this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
    return this.materials.get(color);
  }
  mesh(parent, shape, size, position, color) {
    const mesh = new THREE.Mesh(this.geometries[shape], this.material(color));
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(parent, w, h, d, x, y, z, color, round = false) {
    return this.mesh(parent, round ? 'rounded' : 'box', [w, h, d], [x, y, z], color);
  }
  ball(parent, x, y, z, size, color, shape = 'sphere') {
    return this.mesh(
      parent,
      shape,
      Array.isArray(size) ? size : [size, size, size],
      [x, y, z],
      color,
    );
  }
  rod(parent, a, b, radius, color) {
    const start = point(...a),
      end = point(...b),
      delta = end.clone().sub(start);
    const mesh = this.mesh(
      parent,
      'cylinder',
      [radius, delta.length(), radius],
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      color,
    );
    mesh.quaternion.setFromUnitVectors(point(0, 1, 0), delta.normalize());
    return mesh;
  }
  group(parent, x = 0, y = 0, z = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }
  sign(parent, text, width, x, y, z) {
    this.box(parent, width + 0.1, 0.43, 0.1, x, y, z, '#8c6947', true);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ecddbb';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#56472e';
    ctx.font = 'bold 48px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    material.userData.transient = true;
    const sign = this.box(parent, width, 0.35, 0.012, x, y, z + 0.058, '#ffffff');
    sign.material = material;
  }
  batch(group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(),
      buckets = new Map(),
      meshes = [];
    group.traverse((object) => {
      if (!object.isMesh) return;
      meshes.push(object);
      const geometry = object.geometry
        .clone()
        .applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      if (!buckets.has(object.material)) buckets.set(object.material, []);
      buckets.get(object.material).push(geometry);
    });
    meshes.forEach((mesh) => mesh.removeFromParent());
    for (const [material, geometries] of buckets) {
      const geometry = mergeGeometries(geometries);
      geometries.forEach((item) => item.dispose());
      geometry.userData.owned = true;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  clearGroup(group) {
    if (!group) return;
    const geometries = new Set(),
      materials = new Set();
    group.traverse((object) => {
      if (object.geometry?.userData.owned) geometries.add(object.geometry);
      if (object.material?.userData.transient) materials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    this.scene.remove(group);
  }
  update(town, labels) {
    this.clearGroup(this.world);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.actors = [];
    this.motions = [];
    this.targets = [];
    this.anchors = [];
    for (const [id, [x, z]] of Object.entries(PLOTS)) {
      const group = this.group(this.world, x, 0.08, z);
      group.userData.plot = id;
      this.targets.push(group);
      this.anchors.push({
        id,
        width: id === 'mine' ? 132 : Math.max(76, labels[id].length * 7 + 35),
        position: point(x, 0.2, z + (id === 'mine' ? 1.65 : 1.85)),
      });
      if (id === 'mine') this.mine(group, labels.mine);
      else {
        const stage = town.buildings[id],
          project = town.projects[id];
        if (!stage) this.plot(group, id, project?.wins ?? -1, labels[id]);
        else if (id === 'well') this.well(group);
        else {
          this.building(group, id, stage, labels[id]);
          if (id === 'home' && project?.stage === 2) this.homeWing(group, project.wins);
        }
      }
      this.batch(group);
    }
    const household =
      town.buildings.well && town.buildings.farm && town.buildings.home
        ? town.buildings.home * 2
        : 0;
    this.person({
      color: '#738a83',
      skin: '#d5ad88',
      hat: '#b38d59',
      route: [
        [-1.5, -4.5],
        [-1.6, -1.8],
        [-1.8, 1.6],
        [-1.6, 3.9],
      ],
      seed: 1,
    });
    if (household) {
      this.person({
        color: '#aa6959',
        skin: '#d7b291',
        hat: '#846642',
        route: [
          [-2.5, -0.6],
          [-1.5, -0.8],
          [1.7, -0.8],
          [2.3, 1],
        ],
        seed: 4,
      });
      this.person({
        color: '#d2a56a',
        skin: '#8d6045',
        hat: '#d7bf8b',
        route: [
          [1.6, 4.2],
          [1.8, 2.9],
          [1.7, 1.3],
          [1.8, -1.1],
        ],
        seed: 9,
        dress: true,
      });
    }
    if (household > 2)
      this.person({
        color: '#879460',
        skin: '#b07c59',
        hat: '#ae814d',
        route: [
          [-2.4, 4.1],
          [-1.7, 2.5],
          [-2.1, 0.2],
        ],
        seed: 13,
      });
    if (town.buildings.farm)
      this.person({
        color: '#809267',
        skin: '#af7b56',
        hat: '#d7b671',
        route: [
          [5.4, -0.9],
          [5.2, -1.4],
        ],
        seed: 2,
        work: 'farm',
      });
    if (town.buildings.saloon)
      this.person({
        color: '#a47d91',
        skin: '#edc7a4',
        hat: '#b89869',
        route: [
          [-3.5, 3.9],
          [-3.2, 3.7],
        ],
        seed: 6,
        work: 'greet',
        dress: true,
      });
    if (town.buildings.sheriff)
      this.person({
        color: '#7899a5',
        skin: '#c99d74',
        hat: '#b38f51',
        route: [
          [1.4, 5.9],
          [1.9, 3.7],
          [1.7, 0.2],
        ],
        seed: 15,
      });
    if (town.buildings.stable) {
      this.horse(5.9, 3.2, 0.5);
      this.horse(6.3, 1.3, -0.9, 0.85);
    }
    const cart = this.group(this.world, 0.1, 0.08, -4.6);
    this.box(cart, 0.75, 0.4, 0.55, 0, 0.45, 0, '#617d80', true);
    for (const x of [-0.32, 0.32])
      for (const z of [-0.2, 0.2])
        this.rod(cart, [x - 0.04, 0.18, z], [x + 0.04, 0.18, z], 0.15, '#554b38');
    for (let n = 0; n < 4; n++)
      this.ball(
        cart,
        (n % 2) * 0.23 - 0.12,
        0.7,
        Math.floor(n / 2) * 0.16 - 0.09,
        0.13,
        n % 2 ? '#b58ed4' : '#83b6b7',
        'rock',
      );
    this.motions.push((time) => {
      cart.position.z = -4.6 + Math.sin(time * 0.45) * 0.32;
    });
    this.actors.forEach((actor) => this.animatePerson(actor, this.elapsed));
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
    this.render();
  }
  cactus(parent, x, z) {
    this.rod(parent, [x, 0, z], [x, 1.25, z], 0.11, '#7c9470');
    this.rod(parent, [x, 0.6, z], [x - 0.35, 0.6, z], 0.085, '#7c9470');
    this.rod(parent, [x - 0.35, 0.6, z], [x - 0.35, 0.95, z], 0.085, '#7c9470');
    this.rod(parent, [x, 0.8, z], [x + 0.27, 0.8, z], 0.075, '#7c9470');
    this.rod(parent, [x + 0.27, 0.8, z], [x + 0.27, 1.1, z], 0.075, '#7c9470');
  }
  plot(parent, id, wins, label) {
    const w = id === 'well' ? 2.1 : 3.05,
      d = id === 'well' ? 2.1 : 2.7;
    for (const x of [-w / 2, w / 2])
      for (const z of [-d / 2, d / 2]) this.box(parent, 0.08, 0.3, 0.08, x, 0.13, z, '#a58a57');
    for (const z of [-d / 2, d / 2])
      this.rod(parent, [-w / 2, 0.24, z], [w / 2, 0.24, z], 0.012, '#e5cf9b');
    for (const x of [-w / 2, w / 2])
      this.rod(parent, [x, 0.24, -d / 2], [x, 0.24, d / 2], 0.012, '#e5cf9b');
    if (wins < 0) {
      this.box(parent, 0.08, 0.5, 0.08, -w / 2 + 0.25, 0.2, d / 2 - 0.25, '#99805a');
      this.sign(parent, label, 1.05, -w / 2 + 0.25, 0.52, d / 2 - 0.25);
      return;
    }
    for (let n = 0; n < 5; n++)
      this.box(parent, 0.18, 0.11, 1.2, w / 2 + 0.22, 0.1 + n * 0.09, 0.1, '#bd9a67');
    if (wins === 0) return;
    if (id === 'well') {
      this.well(parent, wins === 1 ? 'foundation' : 'frame');
      return;
    }
    this.box(parent, 2.85, 0.2, 2.5, 0, 0.13, 0, '#a99579');
    if (wins === 1) {
      for (const x of [-1.3, 1.3]) this.box(parent, 0.12, 0.75, 2.3, x, 0.6, 0, '#b9a183');
      for (const z of [-1.13, 1.13]) this.box(parent, 2.6, 0.45, 0.12, 0, 0.46, z, '#b9a183');
      return;
    }
    this.building(parent, id, 0, label, true);
    for (const x of [-1.7, 1.7]) {
      for (const z of [-1.4, 1.4]) this.rod(parent, [x, 0, z], [x, 2.1, z], 0.045, '#b09771');
      this.box(parent, 0.55, 0.08, 3.0, x, 1.32, 0, '#b9a072');
      this.rod(parent, [x, 0.1, -1.4], [x, 2, 1.4], 0.035, '#b09771');
    }
  }
  building(parent, id, stage, label, framing = false) {
    const fronts = {
      home: '#c59376',
      farm: '#a96f52',
      stable: '#b49466',
      saloon: '#ceb274',
      sheriff: '#7e9b9b',
    };
    const w = 2.65,
      d = 2.4,
      h = 1.85,
      timber = framing ? '#bd9b6c' : fronts[id];
    this.box(parent, w + 0.3, 0.18, d + 0.3, 0, 0.13, 0, '#a88c60');
    this.box(parent, w, 0.08, d, 0, 0.26, 0, '#816b49');
    for (const x of [-w / 2, w / 2])
      for (const z of [-d / 2, d / 2])
        this.box(parent, 0.12, h, 0.12, x, h / 2 + 0.25, z, framing ? '#a98a5e' : colors.trim);
    for (let row = 0; row < 9; row++) {
      const y = 0.38 + row * 0.19;
      for (const x of [-w / 2, w / 2]) {
        if (!framing || row < 3) this.box(parent, 0.1, 0.175, d, x, y, 0, timber);
      }
      for (const z of [-d / 2, d / 2]) {
        if (framing && row > 3) continue;
        for (const x of [-0.91, 0, 0.91]) {
          if (z > 0 && x === 0 && row < 6) continue;
          this.box(parent, 0.86, 0.175, 0.1, x, y, z, row % 3 === 0 ? '#bba17a' : timber);
        }
      }
    }
    for (const x of [-w / 2, w / 2])
      this.rod(parent, [x, h + 0.25, -d / 2], [x, h + 0.25, d / 2], 0.07, '#987443');
    this.rod(parent, [0, 2.95, -1.4], [0, 2.95, 1.4], 0.09, '#8d6844');
    for (const z of [-1.25, 0, 1.25]) {
      this.rod(parent, [-1.5, 2.05, z], [0, 2.95, z], 0.07, '#aa8454');
      this.rod(parent, [0, 2.95, z], [1.5, 2.05, z], 0.07, '#aa8454');
    }
    for (const side of [-1, 1])
      for (let n = 0; n < 9; n++) {
        if (framing && (n + (side === 1 ? 2 : 0)) % 3 !== 0) continue;
        const slab = this.box(
          parent,
          1.85,
          0.105,
          0.33,
          side * 0.77,
          2.5,
          -1.34 + n * 0.335,
          id === 'home' || id === 'sheriff' ? '#658580' : '#937447',
        );
        slab.rotation.z = -side * 0.54;
      }
    if (framing) return;
    for (let row = 0; row < 5; row++) {
      for (const z of [-d / 2, d / 2])
        this.box(parent, w * (1 - row / 5.1), 0.16, 0.1, 0, 2.1 + row * 0.165, z, timber);
    }
    this.box(parent, 0.64, 1.28, 0.09, 0, 0.89, 1.225, '#65533b', true);
    this.ball(parent, 0.2, 0.83, 1.29, 0.035, '#e3c687');
    for (const x of [-0.91, 0.91]) this.window(parent, x, 1.25, 1.27);
    const sidewindow = this.group(parent, 1.38, 0, 0);
    sidewindow.rotation.y = Math.PI / 2;
    this.window(sidewindow, 0, 1.25, 0);
    if (id === 'saloon' || id === 'sheriff') {
      this.box(parent, w + 0.1, 0.88, 0.15, 0, 2.45, 1.28, timber);
      this.box(parent, w + 0.3, 0.12, 0.2, 0, 2.91, 1.3, colors.trim);
      this.sign(parent, label, 2.05, 0, 2.45, 1.39);
    } else this.sign(parent, label, 1.4, 0, 1.98, 1.3);
    if (id === 'saloon') {
      this.box(parent, 3.1, 0.15, 0.9, 0, 0.14, 1.75, '#bca06d');
      for (const x of [-1.4, 1.4]) this.box(parent, 0.1, 1.5, 0.1, x, 0.92, 2.13, colors.trim);
      for (let n = 0; n < 8; n++) {
        const awning = this.box(
          parent,
          0.39,
          0.08,
          0.99,
          -1.36 + n * 0.39,
          1.74,
          1.72,
          n % 2 ? '#b97e5e' : '#ecdfb9',
        );
        awning.rotation.x = 0.2;
      }
    }
    if (id === 'farm') {
      const field = this.group(parent, 1.4, 0, 1.5);
      this.box(field, 2.4, 0.06, 1.6, 0, 0.02, 0, '#8d8050');
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 6; col++) {
          const x = -1 + col * 0.4,
            z = -0.6 + row * 0.4;
          this.rod(field, [x, 0.07, z], [x, 0.4, z], 0.025, '#798d43');
          this.ball(field, x + 0.06, 0.23, z, [0.13, 0.035, 0.06], '#92a557');
          this.ball(field, x - 0.06, 0.32, z, [0.13, 0.035, 0.06], '#afba67');
        }
    }
    if (id === 'home') {
      this.box(parent, 0.3, 0.8, 0.35, -0.65, 2.9, -0.6, '#a76c53');
      if (stage > 1) this.homeWing(parent, 4);
    }
    for (const x of [-1.3, 1.3]) this.ball(parent, x, 0.17, 1.45, [0.32, 0.18, 0.27], '#8b9e62');
  }
  homeWing(parent, wins) {
    const wing = this.group(parent, -1.85, 0, 0.15);
    if (wins === 0) {
      for (let n = 0; n < 5; n++)
        this.box(wing, 0.8, 0.09, 0.17, 0, 0.08 + n * 0.09, 0.3, '#bd9a67');
      return;
    }
    this.box(wing, 1.35, 0.18, 1.9, 0, 0.12, 0, '#a99579');
    if (wins === 1) return;
    for (const x of [-0.6, 0.6])
      for (const z of [-0.87, 0.87]) this.box(wing, 0.08, 1.25, 0.08, x, 0.81, z, '#b39469');
    for (let row = 0; row < (wins === 2 ? 3 : 7); row++) {
      const y = 0.32 + row * 0.16;
      for (const x of [-0.6, 0.6]) this.box(wing, 0.08, 0.145, 1.75, x, y, 0, '#d4ad89');
      for (const z of [-0.87, 0.87]) this.box(wing, 1.2, 0.145, 0.08, 0, y, z, '#d4ad89');
    }
    if (wins < 3) return;
    for (const z of [-0.9, 0, 0.9])
      this.rod(wing, [-0.7, 1.3, z], [0.7, 1.55, z], 0.045, '#9d7b50');
    if (wins < 4) return;
    const roof = this.box(wing, 1.5, 0.14, 2.0, 0, 1.43, 0, '#73928a');
    roof.rotation.z = 0.18;
    this.window(wing, 0, 0.95, 0.9);
  }
  window(parent, x, y, z) {
    this.box(parent, 0.54, 0.65, 0.06, x, y, z, '#514d37');
    this.box(parent, 0.44, 0.55, 0.06, x, y, z + 0.04, '#e1bd75');
    for (const dx of [-0.27, 0, 0.27])
      this.box(parent, 0.035, 0.68, 0.055, x + dx, y, z + 0.08, colors.trim);
    for (const dy of [-0.32, 0, 0.32])
      this.box(parent, 0.56, 0.035, 0.055, x, y + dy, z + 0.08, colors.trim);
    this.box(parent, 0.67, 0.15, 0.25, x, y - 0.43, z + 0.08, '#9b7852');
    for (let n = 0; n < 3; n++)
      this.ball(parent, x - 0.21 + n * 0.21, y - 0.34, z + 0.15, [0.14, 0.1, 0.12], '#7f9c65');
    this.ball(parent, x - 0.15, y - 0.25, z + 0.15, 0.065, '#e3a086');
  }
  well(parent, phase = 'done') {
    for (let layer = 0; layer < (phase === 'foundation' ? 1 : 3); layer++)
      for (let n = 0; n < 12; n++) {
        const angle = ((n + layer * 0.5) * Math.PI) / 6;
        const stone = this.box(
          parent,
          0.34,
          0.18,
          0.28,
          Math.cos(angle) * 0.59,
          0.17 + layer * 0.19,
          Math.sin(angle) * 0.59,
          n % 3 ? '#c8b597' : '#ad9b7e',
          true,
        );
        stone.rotation.y = -angle;
      }
    if (phase === 'foundation') return;
    this.mesh(
      parent,
      'cylinder',
      [0.48, 0.025, 0.48],
      [0, 0.2, 0],
      phase === 'done' ? '#6bacae' : '#77684d',
    );
    for (const x of [-0.86, 0.86]) this.box(parent, 0.14, 2.0, 0.14, x, 1.05, 0, '#ac8551');
    this.rod(parent, [-0.95, 1.7, 0], [0.95, 1.7, 0], 0.07, '#86613d');
    for (const side of [-1, 1]) {
      const roof = this.box(
        parent,
        1.25,
        0.12,
        1.75,
        side * 0.5,
        2.25,
        0,
        phase === 'done' ? '#5f8a89' : '#b69a6c',
      );
      roof.rotation.z = -side * 0.4;
    }
    if (phase !== 'done') return;
    this.rod(parent, [0, 1.75, 0], [0, 0.73, 0], 0.012, '#d6c298');
    this.mesh(parent, 'cone', [0.13, 0.22, 0.13], [0, 0.75, 0], '#aa7748');
  }
  mine(parent, label) {
    for (const [x, y, z, s] of [
      [-1.5, 1, -0.3, 1.2],
      [1.4, 1, -0.5, 1.3],
      [0, 2.1, -0.7, 1.4],
      [-0.8, 2, -0.7, 0.9],
      [1, 2, -1, 1],
    ])
      this.ball(parent, x, y, z, [s, s * 0.85, s * 0.7], x > 0 ? '#9d987b' : '#b6aa89', 'rock');
    this.box(parent, 1.75, 2.0, 0.12, 0, 1.05, 0.48, '#333b31', true);
    for (const x of [-1, 1]) this.box(parent, 0.2, 2.2, 0.25, x, 1.05, 0.67, '#ae8956');
    this.box(parent, 2.4, 0.25, 0.3, 0, 2.17, 0.68, '#997144');
    this.sign(parent, label, 1.9, 0, 2.36, 0.8);
    for (const x of [-0.38, 0.38]) this.box(parent, 0.06, 0.04, 3.1, x, 0.06, 1.15, '#737b70');
    for (let n = 0; n < 9; n++)
      this.box(parent, 1, 0.065, 0.13, 0, 0.04, -0.1 + n * 0.35, '#9f8157');
    this.box(parent, 0.16, 0.28, 0.18, -1.22, 1.63, 0.78, '#e7bd73', true);
  }
  person({ color, skin, hat, route, seed, work, dress }) {
    const root = this.group(this.world);
    const body = this.group(root, 0, 0.54, 0);
    this.box(body, 0.25, 0.19, 0.16, 0, 0, 0, '#69654d', true);
    const torso = this.group(body, 0, 0.1, 0);
    this.box(torso, 0.3, 0.34, 0.18, 0, 0.13, 0, color, true);
    this.rod(torso, [0, 0.29, 0], [0, 0.39, 0], 0.055, skin);
    const head = this.group(torso, 0, 0.46, 0);
    this.ball(head, 0, 0, 0, [0.12, 0.145, 0.115], skin);
    this.ball(head, 0, 0.045, -0.03, [0.123, 0.12, 0.097], '#73563d');
    this.ball(head, 0, -0.005, 0.111, [0.022, 0.028, 0.025], skin);
    for (const x of [-0.044, 0.044]) this.ball(head, x, 0.025, 0.105, 0.012, '#39392f');
    this.mesh(head, 'cylinder', [0.195, 0.025, 0.18], [0, 0.105, 0], hat);
    this.mesh(head, 'cone', [0.12, 0.115, 0.11], [0, 0.164, 0], hat);
    this.mesh(head, 'cylinder', [0.122, 0.028, 0.112], [0, 0.129, 0], '#6a6050');
    const arms = [],
      legs = [];
    for (const side of [-1, 1]) {
      const arm = this.group(torso, side * 0.18, 0.24, 0);
      this.rod(arm, [0, 0, 0], [side * 0.015, -0.2, 0], 0.05, color);
      const fore = this.group(arm, side * 0.015, -0.2, 0);
      this.rod(fore, [0, 0, 0], [0, -0.18, 0], 0.039, skin);
      this.ball(fore, 0, -0.19, 0, [0.045, 0.057, 0.04], skin);
      arms.push({ upper: arm, lower: fore });
      const thigh = this.group(body, side * 0.078, -0.065, 0);
      this.rod(thigh, [0, 0, 0], [0, -0.22, 0], 0.065, '#68674f');
      const shin = this.group(thigh, 0, -0.22, 0);
      this.rod(shin, [0, 0, 0], [0, -0.21, 0], 0.047, '#77745b');
      this.box(shin, 0.105, 0.08, 0.19, 0, -0.215, 0.035, '#5c4c39', true);
      legs.push({ upper: thigh, lower: shin });
    }
    if (dress) this.mesh(body, 'cone', [0.2, 0.29, 0.17], [0, -0.085, 0], color);
    const points = route.map(([x, z]) => point(x, 0.07, z));
    const curve = new THREE.CatmullRomCurve3(
      [...points, ...points.slice(1, -1).reverse()],
      true,
      'catmullrom',
      0.15,
    );
    const duration = curve.getLength() / 0.55;
    this.actors.push({ root, body, torso, head, arms, legs, curve, duration, seed, work });
    this.batch(head);
    arms.forEach((arm) => this.batch(arm.lower));
    root.traverse((object) => {
      if (object.isMesh) object.castShadow = false;
    });
    this.contactShadow(root, 0.27, 0.18);
  }
  animatePerson(actor, time) {
    const { root, body, torso, head, arms, legs, curve, duration, seed, work } = actor;
    const cycle = (time + seed) % (duration + 4),
      walking = !work && cycle < duration;
    const progress = work?.length ? 0.1 : Math.min(cycle / duration, 0.9999);
    root.position.copy(curve.getPointAt(progress));
    const tangent = curve.getTangentAt(progress);
    root.rotation.y = Math.atan2(tangent.x, tangent.z);
    const step = (time + seed) * 6;
    body.position.y =
      0.54 + (walking ? Math.cos(step * 2) * 0.013 : Math.sin(time * 1.8 + seed) * 0.005);
    torso.rotation.z = walking ? Math.sin(step) * 0.025 : 0;
    head.rotation.y = walking
      ? Math.sin(time * 0.7 + seed) * 0.1
      : Math.sin(time * 0.8 + seed) * 0.25;
    for (let n = 0; n < 2; n++) {
      const swing = Math.sin(step + n * Math.PI);
      legs[n].upper.rotation.x = walking ? swing * 0.36 : 0;
      legs[n].lower.rotation.x = walking ? Math.max(0, -swing) * 0.6 : 0;
      arms[n].upper.rotation.x = walking ? -swing * 0.28 : -0.12;
      arms[n].lower.rotation.x = -0.16;
    }
    if (!walking) {
      if (work === 'farm') {
        torso.rotation.x = 0.22 + Math.sin(time * 1.9) * 0.12;
        arms[0].upper.rotation.x = -0.7 + Math.sin(time * 1.9) * 0.3;
      } else {
        torso.rotation.x = 0;
        arms[1].upper.rotation.z = -0.65;
        arms[1].lower.rotation.x = -1.2 + Math.sin(time * 3) * 0.2;
      }
    } else {
      torso.rotation.x = 0;
      arms[1].upper.rotation.z = 0;
    }
  }
  horse(x, z, rotation, scale = 1) {
    const root = this.group(this.world, x, 0.07, z);
    root.rotation.y = rotation;
    root.scale.setScalar(scale);
    this.ball(root, 0, 0.73, 0, [0.24, 0.31, 0.55], '#a97950');
    for (const dx of [-0.15, 0.15])
      for (const dz of [-0.33, 0.33]) {
        this.rod(root, [dx, 0.64, dz], [dx, 0.3, dz + 0.02], 0.055, '#986b46');
        this.rod(root, [dx, 0.3, dz + 0.02], [dx, 0.05, dz + 0.04], 0.04, '#b38c63');
        this.box(root, 0.1, 0.08, 0.13, dx, 0.05, dz + 0.06, '#574b36', true);
      }
    const head = this.group(root, 0, 0.84, 0.39);
    this.ball(head, 0, 0.22, 0.05, [0.13, 0.38, 0.18], '#a97950');
    this.ball(head, 0, 0.44, 0.18, [0.13, 0.14, 0.23], '#ad8158');
    for (const dx of [-0.075, 0.075]) {
      this.ball(head, dx, 0.64, 0.11, [0.035, 0.1, 0.06], '#a97950');
      this.ball(head, dx * 1.7, 0.49, 0.22, 0.018, '#393d30');
    }
    this.box(root, 0.35, 0.09, 0.28, 0, 1.04, -0.02, '#637e79', true);
    this.rod(root, [0, 0.86, -0.47], [0, 0.4, -0.66], 0.055, '#594b34');
    this.motions.push((time) => {
      head.rotation.x = 0.18 + Math.sin(time * 0.9 + rotation) * 0.14;
    });
    this.batch(head);
    root.traverse((object) => {
      if (object.isMesh) object.castShadow = false;
    });
    this.contactShadow(root, 0.3, 0.63);
  }
  contactShadow(parent, width, depth) {
    const shadow = new THREE.Mesh(this.geometries.shadow, this.contactShadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(width, depth, 1);
    shadow.position.y = -0.04;
    parent.add(shadow);
  }
  select(id) {
    this.selected = id;
    if (this.selection) {
      this.world.remove(this.selection);
      this.selection.geometry.dispose();
      this.selection.material.dispose();
    }
    const [x, z] = PLOTS[id] ?? [0, 0];
    this.selection = new THREE.Mesh(
      new THREE.RingGeometry(1.65, 1.71, 64),
      new THREE.MeshBasicMaterial({
        color: '#f2dda1',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.position.set(x, 0.095, z);
    this.world.add(this.selection);
    this.render();
  }
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = this.raycaster.intersectObjects(this.targets, true)[0];
    let object = hit?.object;
    while (object && !object.userData.plot) object = object.parent;
    if (object) this.onSelect(object.userData.plot);
    else {
      const ground = this.raycaster.ray.intersectPlane(
        new THREE.Plane(point(0, 1, 0), -0.08),
        new THREE.Vector3(),
      );
      if (!ground) return;
      for (const [id, [x, z]] of Object.entries(PLOTS)) {
        if (id !== 'mine' && Math.abs(ground.x - x) < 1.55 && Math.abs(ground.z - z) < 1.4) {
          this.onSelect(id);
          break;
        }
      }
    }
  }
  resize() {
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.fov = width / height < 1.1 ? 48 : 40;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }
  render() {
    if (!this.world) return;
    this.renderer.render(this.scene, this.camera);
    const distant = this.camera.position.distanceTo(this.controls.target) > 42;
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    const projected = this.anchors.map(({ id, position, width: labelWidth }) => {
      const p = position.clone().project(this.camera);
      return {
        id,
        x: (p.x + 1) * 50,
        y: (1 - p.y) * 50,
        depth: p.z,
        width: labelWidth,
        visible:
          p.z > -1 &&
          p.z < 1 &&
          Math.abs(p.x) < 0.91 &&
          p.y < 0.84 &&
          p.y > (width < 600 ? -0.42 : -0.78) &&
          (!distant || id === 'mine' || id === this.selected),
      };
    });
    const shown = [];
    const priority = (id) => (id === 'mine' ? 0 : id === this.selected ? 1 : 2);
    for (const anchor of [...projected].sort(
      (a, b) => priority(a.id) - priority(b.id) || a.depth - b.depth,
    )) {
      if (!anchor.visible) continue;
      if (
        shown.some(
          (other) =>
            (Math.abs(anchor.x - other.x) * width) / 100 < (anchor.width + other.width) / 2 + 4 &&
            (Math.abs(anchor.y - other.y) * height) / 100 < 42,
        )
      )
        anchor.visible = false;
      else shown.push(anchor);
    }
    this.onLabels(projected);
  }

  tick(now) {
    if (this.lastFrame && now - this.lastFrame < 1000 / 24) return;
    this.elapsed += this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = now;
    this.actors?.forEach((actor) => this.animatePerson(actor, this.elapsed));
    this.motions?.forEach((motion) => motion(this.elapsed));
    this.renderer.render(this.scene, this.camera);
  }
  cameraAction(action) {
    if (!this.controls.enabled) return;
    if (action === 'in') this.controls.dollyIn(1 / 1.18);
    if (action === 'out') this.controls.dollyOut(1 / 1.18);
    if (action === 'left') this.controls.rotateLeft(Math.PI / 8);
    if (action === 'right') this.controls.rotateLeft(-Math.PI / 8);
    if (action === 'up') this.controls.rotateUp(Math.PI / 18);
    if (action === 'down') this.controls.rotateUp(-Math.PI / 18);
    if (action === 'reset') this.controls.reset();
  }
  setPaused(paused) {
    this.controls.enabled = !paused;
  }
  setMotion(enabled) {
    this.lastFrame = 0;
    this.renderer.setAnimationLoop(enabled ? this.tick : null);
    if (!enabled) {
      this.actors?.forEach((actor) => this.animatePerson(actor, this.elapsed));
      this.render();
    }
  }
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.controls.removeEventListener('change', this.cameraChanged);
    this.controls.dispose();
    if (this.selection) {
      this.selection.geometry.dispose();
      this.selection.material.dispose();
    }
    this.clearGroup(this.world);
    this.clearGroup(this.landscape);
    Object.values(this.geometries).forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.contactShadowMaterial.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
