import * as THREE from 'three';

const smooth = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const random = (n) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
function noise(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const tx = smooth(0, 1, x - ix),
    tz = smooth(0, 1, z - iz);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(random(ix + iz * 157), random(ix + 1 + iz * 157), tx),
    THREE.MathUtils.lerp(random(ix + (iz + 1) * 157), random(ix + 1 + (iz + 1) * 157), tx),
    tz,
  );
}

// A level clearing for foundations blends into rolling prairie in every direction.
export function groundHeight(x, z) {
  const distance = Math.hypot(x, z);
  const hills =
    1.8 +
    noise(x * 0.048, z * 0.048) * 6.5 +
    Math.sin(x * 0.065 + z * 0.027) * 1.9 +
    noise(x * 0.14, z * 0.14) * 0.7;
  const ridges = [
    [-38, -42, 11],
    [32, -45, 14],
    [55, 4, 12],
    [-45, 28, 9],
    [5, 58, 11],
  ].reduce(
    (height, [hx, hz, rise]) => height + rise * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / 440),
    0,
  );
  return smooth(10, 25, distance) * (hills + ridges);
}
function trackDistance(x, z) {
  const bend = smooth(9, 22, Math.abs(z)) * Math.sin(z * 0.065) * 6;
  const main = Math.abs(x - bend);
  const side = Math.min(Math.abs(z + 0.7), Math.abs(z - 3.8)) + smooth(10, 28, Math.abs(x)) * 7;
  return Math.min(main, side);
}

// Orbiting low over a distant ridge must not put the camera beneath the prairie.
// Keep the player's distance and heading; raise only the viewing angle as needed.
export function keepCameraAboveTerrain(position, target, minPolarAngle = 0.25) {
  const orbit = new THREE.Spherical().setFromVector3(position.clone().sub(target));
  let adjusted = false;
  for (let i = 0; i < 24 && position.y < groundHeight(position.x, position.z) + 1.2; i++) {
    orbit.phi = Math.max(minPolarAngle, orbit.phi - 0.06);
    position.setFromSpherical(orbit).add(target);
    adjusted = true;
  }
  return adjusted;
}

export function buildLandscape(town) {
  const landscape = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(260, 260, 208, 208);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [],
    sand = new THREE.Color('#cdbb8b'),
    sage = new THREE.Color('#a8af80');
  const track = new THREE.Color('#bd9c6e'),
    color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      height = groundHeight(x, z);
    positions.setY(i, height);
    const meadow = smooth(0.32, 0.78, noise(x * 0.095 + 18, z * 0.095));
    color.copy(sand).lerp(sage, meadow * 0.64);
    color.multiplyScalar(0.96 + noise(x * 0.35, z * 0.35) * 0.09);
    color.lerp(track, (1 - smooth(0.7, 1.8, trackDistance(x, z))) * 0.8);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.userData.owned = true;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  material.userData.transient = true;
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  landscape.add(ground);

  const plants = town.group(landscape);
  // Cottonwoods near the settlement, with smaller junipers scattered into the hills.
  for (const [x, z, scale, seed] of [
    [-9, -7, 1.15, 1],
    [9.5, -9, 1.25, 2],
    [-12, 4, 1.2, 3],
    [12.5, 5.5, 1.05, 4],
    [-7.5, 13, 0.9, 5],
    [9, 13, 0.8, 6],
    [-16, -15, 1.1, 7],
    [18, -17, 0.9, 8],
  ])
    tree(town, plants, x, z, scale, seed);
  for (let i = 0; i < 48; i++) {
    const angle = random(i + 32) * Math.PI * 2;
    const radius = 22 + random(i + 190) * 58;
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (trackDistance(x, z) > 3) tree(town, plants, x, z, 0.7 + random(i + 4) * 0.8, i + 12);
  }
  for (let i = 0; i < 620; i++) {
    const x = (random(i * 3 + 5) - 0.5) * 105;
    const z = (random(i * 3 + 6) - 0.5) * 105;
    if (Math.hypot(x, z) < 9 || trackDistance(x, z) < 2) continue;
    const y = groundHeight(x, z),
      size = 0.15 + random(i + 91) * 0.25;
    if (i % 5 === 0) {
      town.ball(plants, x, y + size * 0.35, z, [size * 1.6, size * 0.7, size], '#b9aa86', 'rock');
    } else {
      const tuft = town.group(plants, x, y, z);
      for (let blade = 0; blade < 3; blade++) {
        const stem = town.box(
          tuft,
          0.025,
          size,
          0.035,
          (blade - 1) * 0.07,
          size * 0.45,
          0,
          i % 2 ? '#a3aa79' : '#b8ab74',
        );
        stem.rotation.z = (blade - 1) * 0.5;
        stem.rotation.y = i;
      }
    }
  }
  for (const [x, z] of [
    [-10, -1],
    [10, 1],
    [-16, 10],
    [14, -12],
    [-24, -8],
    [20, 19],
  ]) {
    const plant = town.group(plants, x, groundHeight(x, z), z);
    town.cactus(plant, 0, 0);
  }
  town.batch(plants);
  return landscape;
}

function tree(town, parent, x, z, scale, seed) {
  const tree = town.group(parent, x, groundHeight(x, z), z);
  tree.scale.setScalar(scale);
  tree.rotation.y = random(seed) * Math.PI * 2;
  const tall = seed % 3 !== 0,
    height = tall ? 3.5 : 2.5;
  const bark = '#8b7858',
    branchColor = '#a18a62';
  town.rod(tree, [0, 0, 0], [0.12, height * 0.48, 0.05], 0.14, bark);
  town.rod(tree, [0.12, height * 0.48, 0.05], [-0.16, height * 0.83, 0], 0.095, bark);
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4 + random(seed + i) * 0.8;
    const reach = 0.8 + random(seed * 7 + i) * 0.55;
    const tip = [
      Math.cos(angle) * reach,
      height * (0.66 + random(seed + i * 11) * 0.34),
      Math.sin(angle) * reach,
    ];
    const fork = [tip[0] * 0.55, height * 0.61, tip[2] * 0.55];
    town.rod(tree, [0.1, height * 0.38, 0], fork, 0.065, bark);
    town.rod(tree, fork, tip, 0.038, branchColor);
    for (let cluster = 0; cluster < 3; cluster++) {
      const radius = 0.48 + random(seed * 17 + i * 3 + cluster) * 0.28;
      town.ball(
        tree,
        tip[0] + Math.cos(cluster * 2.4 + i) * 0.36,
        tip[1] + (cluster === 1 ? 0.38 : 0.02),
        tip[2] + Math.sin(cluster * 2.4 + i) * 0.36,
        [radius, radius * (tall ? 0.88 : 0.65), radius * 0.85],
        ['#82976b', '#91a477', '#a5b383', '#b0ba8d'][(i + cluster + seed) % 4],
        'foliage',
      );
    }
  }
  for (let i = 0; i < 3; i++) {
    const angle = i * 2.1;
    town.rod(tree, [Math.cos(angle) * 0.4, 0.03, Math.sin(angle) * 0.4], [0, 0.35, 0], 0.055, bark);
  }
}
