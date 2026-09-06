import * as THREE from 'three';
import { roadLevel, population } from './TownRules';

// Actors share the town's geometry cache; only their joints move each frame.
export function mountedRider(
  d,
  parent,
  { color = '#886650', hat = '#a78758', bandit = false, seed = 0 } = {},
) {
  const root = d.group(parent),
    horse = d.group(root);
  root.userData.animated = true;
  const coat = ['#a87950', '#796052', '#c2a27b', '#665849'][seed % 4];
  d.ball(horse, 0, 0.87, 0, [0.28, 0.33, 0.62], coat);
  d.ball(horse, 0, 0.94, 0.44, [0.23, 0.3, 0.25], coat);
  const legs = [];
  for (const x of [-0.18, 0.18])
    for (const z of [-0.4, 0.4]) {
      const leg = d.group(horse, x, 0.76, z),
        knee = d.group(leg, 0, -0.34, 0.015);
      d.rod(leg, [0, 0, 0], [0, -0.34, 0.015], 0.067, coat);
      d.rod(knee, [0, 0, 0], [0, -0.32, 0.025], 0.045, coat);
      d.box(knee, 0.115, 0.1, 0.18, 0, -0.34, 0.06, '#493f32', true);
      legs.push({ leg, knee });
    }
  const neck = d.group(horse, 0, 1.02, 0.4);
  d.ball(neck, 0, 0.18, 0.12, [0.17, 0.4, 0.23], coat);
  d.ball(neck, 0, 0.47, 0.25, [0.155, 0.17, 0.28], coat);
  d.ball(neck, 0, 0.42, 0.43, [0.14, 0.115, 0.12], '#b8a18a');
  for (const x of [-0.08, 0.08]) {
    d.ball(neck, x, 0.69, 0.19, [0.04, 0.12, 0.065], coat);
    d.ball(neck, x * 1.85, 0.52, 0.29, 0.023, '#2f302a');
  }
  for (let n = 0; n < 7; n++)
    d.ball(neck, 0, 0.51 - n * 0.08, -0.005 - n * 0.017, [0.06, 0.08, 0.09], '#4e4031');
  d.rod(neck, [-0.15, 0.43, 0.4], [0.15, 0.43, 0.4], 0.016, '#584734');
  for (const x of [-0.16, 0.16]) d.rod(horse, [x, 1.45, 0.7], [x, 1.32, -0.06], 0.012, '#65513a');
  d.box(horse, 0.52, 0.075, 0.5, 0, 1.14, -0.08, bandit ? '#905d49' : '#678b88', true);
  d.box(horse, 0.36, 0.13, 0.32, 0, 1.22, -0.08, '#654b32', true);
  const tail = d.group(horse, 0, 0.97, -0.59);
  d.rod(tail, [0, 0, 0], [0, -0.48, -0.19], 0.075, '#4e4031');
  const rider = d.person({
    parent: horse,
    manual: true,
    color,
    skin: seed % 2 ? '#b88863' : '#d7af8a',
    hat,
    seed,
    route: [
      [0, 0],
      [0, 1],
    ],
  });
  rider.root.position.set(0, 0.77, -0.08);
  rider.legs.forEach((leg, n) => {
    leg.upper.rotation.z = n ? 0.6 : -0.6;
    leg.upper.rotation.x = -0.55;
    leg.lower.rotation.x = 1.0;
  });
  rider.arms.forEach((arm) => {
    arm.upper.rotation.x = -0.65;
    arm.lower.rotation.x = -0.65;
  });
  if (bandit) d.box(rider.head, 0.23, 0.075, 0.055, 0, -0.065, 0.1, '#914e40', true);
  else d.ball(rider.torso, -0.08, 0.22, 0.102, [0.04, 0.045, 0.012], '#e8c16a', 'rock');
  const gun = d.group(rider.arms[1].lower, 0, -0.2, 0.04);
  d.box(gun, 0.045, 0.05, 0.27, 0, 0.02, 0.1, '#484943');
  d.box(gun, 0.05, 0.105, 0.06, 0, -0.045, 0.015, '#765237');
  gun.visible = false;
  const flash = d.ball(gun, 0, 0.02, 0.28, [0.065, 0.065, 0.13], '#f5d590', 'rock');
  flash.visible = false;
  const loot = d.group(horse, 0.3, 1.05, -0.36);
  d.ball(loot, 0, -0.1, 0, [0.2, 0.27, 0.19], '#c6ad78');
  d.rod(loot, [0, 0.14, 0], [0, 0.19, 0], 0.06, '#776044');
  loot.visible = false;
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  d.contactShadow(root, 0.4, 0.9);
  return {
    root,
    rider,
    loot,
    flash,
    gun,
    animate(time, moving = true, aiming = false) {
      const stride = time * 9 + seed;
      horse.position.y = moving ? Math.sin(stride * 2) * 0.035 : Math.sin(time * 1.6) * 0.007;
      legs.forEach(({ leg, knee }, i) => {
        const swing = Math.sin(stride + (i === 0 || i === 3 ? 0 : Math.PI));
        leg.rotation.x = moving ? swing * 0.42 : 0;
        knee.rotation.x = moving ? Math.max(0, -swing) * 0.65 : 0;
      });
      neck.rotation.x = moving ? Math.sin(stride) * 0.065 : Math.sin(time * 0.8 + seed) * 0.08;
      tail.rotation.z = Math.sin(time * 2.5 + seed) * 0.2;
      rider.torso.rotation.x = moving ? -0.06 + Math.sin(stride) * 0.025 : 0;
      rider.arms[1].upper.rotation.x = aiming ? -1.65 : -0.65;
      rider.arms[1].lower.rotation.x = aiming ? -0.45 : -0.65;
      gun.visible = aiming;
    },
  };
}

export function addTownRoads(d, town, plots) {
  const level = roadLevel(town);
  if (!level) return;
  const roads = d.group(d.world);
  const strip = (a, b, width) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const road = d.box(
      roads,
      width,
      0.015,
      length,
      (a[0] + b[0]) / 2,
      0.025,
      (a[1] + b[1]) / 2,
      level === 1 ? '#c5af80' : '#b99c70',
    );
    road.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
  };
  // Two lanes leave room for the well and sheriff in the central square.
  for (const x of [-1.85, 1.85]) strip([x, -4.4], [x, 9.2], level === 1 ? 0.75 : 1.05);
  for (const [id, [x, z]] of Object.entries(plots)) {
    if (id === 'mine' || !town.buildings[id]) continue;
    const lane = x < 0 ? -1.85 : 1.85;
    strip([x, z + 1.95], [lane, z + 1.95], 0.72 + level * 0.1);
    if (level >= 2 && id !== 'well' && id !== 'well2') {
      for (let i = 0; i < 16; i++)
        d.box(
          roads,
          0.17,
          0.07,
          0.75,
          x - 1.35 + i * 0.18,
          0.07,
          z + 1.65,
          i % 3 ? '#ad9065' : '#b79d73',
        );
    }
  }
  if (level >= 3)
    for (const [x, z] of [
      [-2.3, -0.2],
      [2.3, 4],
      [-2.3, 8.5],
      [2.3, -4.5],
    ]) {
      d.rod(roads, [x, 0, z], [x, 2.3, z], 0.045, '#63726a');
      d.box(roads, 0.18, 0.26, 0.18, x, 2.35, z, '#e8c583', true);
      d.box(roads, 0.25, 0.06, 0.25, x, 2.52, z, '#61746d');
    }
  roads.userData.static = true;
  d.batch(roads);
}

export function addTownVisitors(d, town) {
  if (town.buildings.stable)
    for (let n = 0; n < town.buildings.stable; n++) {
      const mounted = mountedRider(d, d.world, {
        seed: n + 3,
        color: ['#7f9191', '#a77a66', '#879667'][n],
      });
      const curve = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(1.85, 0.07, 3.9),
          new THREE.Vector3(1.85, 0.07, -0.8),
          new THREE.Vector3(1.85, 0.07, -4.35),
          new THREE.Vector3(-1.85, 0.07, -4.35),
          new THREE.Vector3(-1.85, 0.07, -0.8),
          new THREE.Vector3(-1.85, 0.07, 8.5),
          new THREE.Vector3(1.85, 0.07, 8.5),
        ],
        true,
        'catmullrom',
        0.08,
      );
      d.motions.push((time) => {
        const progress = (time / 65 + n / 3) % 1,
          tangent = curve.getTangentAt(progress);
        mounted.root.position.copy(curve.getPointAt(progress));
        mounted.root.rotation.y = Math.atan2(tangent.x, tangent.z);
        mounted.animate(time + n);
      });
    }
  if (town.buildings.saloon)
    for (let n = 0; n < Math.min(4, 1 + Math.floor(population(town) / 6)); n++) {
      const actor = d.person({
        color: ['#aa795f', '#879c88', '#967f95', '#c1a274'][n],
        skin: n % 2 ? '#976f50' : '#d8ae83',
        hat: '#baa06d',
        route: [
          [-1.7, -0.6],
          [-1.9, 3.95],
          [-4.15, 3.95],
          [-4.15, 3.45],
        ],
        seed: n * 7,
        visitor: true,
      });
      actor.duration += 3;
    }
}

export const RAID_DURATION = 21;
export const raidPhase = (time, protectedTown) =>
  time < 5
    ? 'Riders on the ridge'
    : time < 9
      ? 'Warning shots'
      : time < 14
        ? protectedTown
          ? 'The law holds the line'
          : 'Bandits at the mine'
        : 'Back to the open trail';
export class TownRaid {
  constructor(d, event, plots, onPhase, onComplete) {
    this.d = d;
    this.event = event;
    this.onPhase = onPhase;
    this.onComplete = onComplete;
    this.root = d.group(d.scene);
    this.root.name = 'Frontier raid';
    this.started = d.elapsed;
    this.bandits = Array.from({ length: event.gangSize }, (_, n) =>
      mountedRider(d, this.root, {
        bandit: true,
        seed: n,
        color: n % 2 ? '#5d5b50' : '#825b4b',
        hat: '#574d3c',
      }),
    );
    this.patrol = Array.from({ length: event.sheriffLevel }, (_, n) =>
      mountedRider(d, this.root, { seed: n + 1, color: '#688d98', hat: '#c3a05a' }),
    );
    const target = plots[event.targets[1]] ?? plots.mine;
    this.target = [target[0], target[1] + 2.1];
    this.dust = Array.from({ length: event.gangSize * 3 }, () =>
      d.ball(this.root, 0, 0.2, 0, 0.2, '#cbb78d', 'rock'),
    );
    this.dust.forEach((dust) => {
      dust.userData.animated = true;
    });
    this.update(d.elapsed);
  }
  move(actor, from, to, progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    actor.root.position.set(
      THREE.MathUtils.lerp(from[0], to[0], p),
      0.07,
      THREE.MathUtils.lerp(from[1], to[1], p),
    );
    actor.root.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
  }
  travel(actor, points, progress) {
    const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    let distance =
      THREE.MathUtils.clamp(progress, 0, 1) * lengths.reduce((sum, length) => sum + length, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        this.move(actor, points[i], points[i + 1], lengths[i] ? distance / lengths[i] : 1);
        return;
      }
      distance -= lengths[i];
    }
  }
  update(elapsed) {
    const time = elapsed - this.started,
      { event } = this;
    const phase = raidPhase(time, event.outcome === 'protected');
    if (phase !== this.phase) {
      this.phase = phase;
      this.onPhase(phase);
    }
    this.bandits.forEach((actor, n) => {
      const stop = [-1.2 + (n % 3) * 1.1, -4.35 + Math.floor(n / 3) * 0.95];
      const entry = [13 + n * 0.9, -7.8 - n * 0.4];
      const caught =
        event.outcome === 'protected' || n < Math.min(event.gangSize / 2, event.sheriffLevel);
      const retreat = caught ? 10 : 14;
      let moving = time < 5 || time >= retreat;
      if (time < 5) this.move(actor, entry, stop, time / 5);
      else if (time < 9) this.move(actor, stop, stop, 0);
      else if (time < retreat && !caught) {
        // Half the gang circles to the second completed building.
        const target = n % 2 ? [this.target[0] + (n - 2) * 0.35, this.target[1]] : stop;
        const lane = target[0] < 0 ? -1.95 : 1.95;
        this.travel(actor, [stop, [lane, stop[1]], [lane, target[1]], target], (time - 9) / 3);
        moving = time < 12 && n % 2 === 1;
      } else if (time >= retreat) {
        const start = !caught && n % 2 ? [this.target[0] + (n - 2) * 0.35, this.target[1]] : stop;
        // Leave by the front of town, away from the residential plots.
        const corner = [1.9 + n * 0.35, 9.8 + n * 0.2];
        const lane = start[0] < -2 ? -1.95 : 1.95;
        if (time < retreat + 3)
          this.travel(
            actor,
            [start, [lane, start[1]], [lane, corner[1]], corner],
            (time - retreat) / 3,
          );
        else this.move(actor, corner, [17 + n, 11], (time - retreat - 3) / 4);
      }
      actor.root.visible = time < retreat + 7;
      const aiming = time >= 5 && time < 9;
      actor.animate(time, moving, aiming);
      actor.flash.visible =
        aiming && Math.floor((time - 5) / 1.1) % event.gangSize === n && (time - 5) % 1.1 < 0.1;
      actor.loot.visible = !caught && event.loss > 0 && time > 12;
      for (let k = 0; k < 3; k++) {
        const dust = this.dust[n * 3 + k],
          drift = (time * 1.8 + k / 3) % 1;
        dust.visible = actor.root.visible && moving;
        dust.position
          .copy(actor.root.position)
          .add(
            new THREE.Vector3(
              Math.sin(n + k) * drift * 0.5,
              0.1 + drift * 0.25,
              -Math.cos(actor.root.rotation.y) * (0.5 + drift),
            ),
          );
        dust.scale.setScalar(0.12 + drift * 0.3);
      }
    });
    this.patrol.forEach((actor, n) => {
      actor.root.visible = time >= 6 && time < 19;
      const home = [0.65 + n * 0.6, 6.1],
        line = [-1.5 + n * 1.4, -2.25];
      if (time < 10) this.travel(actor, [home, [1.95, 6.8], [1.95, -2.25], line], (time - 6) / 4);
      else if (time < 15) this.move(actor, line, line, 0);
      else this.travel(actor, [line, [1.95, -2.25], [1.95, 6.8], home], (time - 15) / 4);
      if (time >= 10 && time < 15) actor.root.rotation.y = Math.PI;
      actor.animate(time, time < 10 || time >= 15, time >= 10 && time < 14);
    });
    if (time >= RAID_DURATION) {
      this.onComplete();
      this.dispose();
      return true;
    }
    return false;
  }
  dispose() {
    this.d.clearGroup(this.root);
  }
}
