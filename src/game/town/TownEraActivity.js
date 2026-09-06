import { groundHeight } from './TownLandscape';
import { RIVER, riverCenterX } from './TownRiver';
import { PLOTS, RAIL_EDGE, railEdges, routeBetween, plotStreet } from './TownLayout';

export function addEraActivity(d, town) {
  if (town.buildings.fisherman) {
    const [x, z] = PLOTS.fisherman;
    const fisher = d.person({
      color: '#839a82',
      skin: '#cba17a',
      hat: '#bba174',
      seed: 21,
      route: [
        [x + 2, z + 0.2],
        [x + 2, z + 0.4],
      ],
      work: 'greet',
    });
    d.rod(fisher.root, [0, 0.8, 0.15], [0.9, 1.5, 1.2], 0.015, '#987c54');
  }
  if (town.era !== 'river-rail') return;
  if (town.buildings.bridge && town.buildings.home5) {
    const route = routeBetween(town, plotStreet('home5'), plotStreet('saloon'));
    if (route.length > 1)
      d.person({
        color: '#8b849a',
        skin: '#d5ab80',
        hat: '#baab8a',
        seed: 25,
        route,
        linear: true,
      });
  }
  if (town.buildings.riverPort) {
    const boat = d.group(d.world, riverCenterX(-8), RIVER.waterHeight + 0.12, -8);
    boat.name = 'Paddle-wheel steamboat';
    boat.userData.animated = true;
    d.ball(boat, 0, 0, 0, [1.1, 0.35, 2.6], '#725d45');
    d.box(boat, 2.1, 0.15, 4.5, 0, 0.25, 0, '#dfcca2');
    d.box(boat, 1.4, 0.8, 2.4, 0, 0.73, 0, '#e3d3af');
    d.box(boat, 1.85, 0.14, 3, 0, 1.2, 0, '#8c9f91');
    d.mesh(boat, 'cylinder', [0.18, 1.1, 0.18], [0.3, 1.65, -0.6], '#696d62');
    const wheel = d.group(boat, 0, 0.2, 2.2);
    for (let n = 0; n < 8; n++) {
      const paddle = d.group(wheel);
      paddle.rotation.x = (n * Math.PI) / 4;
      d.box(paddle, 1.5, 0.15, 0.3, 0, 0.55, 0, '#9b6e51');
    }
    d.motions.push((time) => {
      const phase = (time + 18) % 95;
      boat.visible = phase < 55;
      const z = phase < 23 ? -65 + phase * 2.5 : phase < 32 ? -7.5 : -7.5 + (phase - 32) * 3;
      boat.position.set(riverCenterX(z), RIVER.waterHeight + 0.12, z);
      boat.rotation.y = Math.atan2(riverCenterX(z + 0.2) - riverCenterX(z), 0.2);
      wheel.rotation.x = time * 1.6;
    });
  }
  if (railEdges(town).length) {
    const rails = d.group(d.world);
    rails.userData.static = true;
    rails.name = 'Station connecting railroad';
    for (let x = RAIL_EDGE.from[0]; x < RAIL_EDGE.to[0]; x++) {
      const z = RAIL_EDGE.from[1];
      for (const dz of [-0.52, 0.52])
        d.rod(
          rails,
          [x, groundHeight(x, z) + 0.08, z + dz],
          [x + 1, groundHeight(x + 1, z) + 0.08, z + dz],
          0.035,
          '#6e7770',
        );
      d.box(rails, 0.17, 0.1, 1.45, x, groundHeight(x, z) + 0.04, z, '#8b7756');
    }
    d.batch(rails);
    const train = d.group(d.world, -17, 0.3, -23);
    train.name = 'Station train';
    train.userData.animated = true;
    d.box(train, 2, 0.6, 0.9, 0, 0.55, 0, '#5d7470');
    d.box(train, 0.65, 1.1, 1, -0.7, 0.9, 0, '#b29b6c');
    d.mesh(train, 'cylinder', [0.15, 0.7, 0.15], [0.6, 1.2, 0], '#565f56');
    for (const dx of [-2.2, -4]) d.box(train, 1.5, 0.9, 1, dx, 0.85, 0, '#a1825c');
    const wheels = [];
    for (const x of [-4.5, -3.5, -2.7, -1.7, -0.6, 0.6])
      for (const z of [-0.55, 0.55]) {
        const wheel = d.mesh(train, 'cylinder', [0.25, 0.09, 0.25], [x, 0.25, z], '#50584f');
        wheel.rotation.x = Math.PI / 2;
        wheels.push(wheel);
      }
    d.motions.push((time) => {
      const phase = (time + 25) % 90;
      train.visible = phase < 45;
      const x = phase < 18 ? -70 + phase * 3 : phase < 27 ? -16 : -16 - (phase - 27) * 3;
      train.position.set(x, groundHeight(x, -23) + 0.14, -23);
      wheels.forEach((wheel) => {
        wheel.rotation.y = time * 3;
      });
    });
  }
}
