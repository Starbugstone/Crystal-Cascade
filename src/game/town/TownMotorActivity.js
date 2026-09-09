import { motorVehicle } from './buildings/motorAge';
import { routeBetween, plotStreet } from './TownLayout';

export function addMotorActivity(d, town) {
  if (town.era !== 'motor-age' || !town.buildings.garage || !town.buildings.busDepot) return;
  const route = routeBetween(town, plotStreet('garage'), plotStreet('busDepot'));
  if (route.length < 2) return;
  const lengths = route
    .slice(1)
    .map((point, i) => Math.hypot(point[0] - route[i][0], point[1] - route[i][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const bus = motorVehicle(d, d.world, true);
  bus.name = 'Valley bus on its village route';
  bus.userData.animated = true;
  d.motions.push((time) => {
    const phase = (time % 44) / 44;
    const returning = phase >= 0.5;
    let distance =
      (returning ? 1 - Math.min(1, (phase - 0.5) / 0.4) : Math.min(1, phase / 0.4)) * total;
    let i = 0;
    while (i < lengths.length - 1 && distance > lengths[i]) distance -= lengths[i++];
    const start = route[i],
      end = route[i + 1],
      fraction = distance / lengths[i];
    bus.position.set(
      start[0] + (end[0] - start[0]) * fraction,
      0.07,
      start[1] + (end[1] - start[1]) * fraction,
    );
    bus.rotation.y = Math.atan2(end[0] - start[0], end[1] - start[1]) + (returning ? Math.PI : 0);
  });
}
