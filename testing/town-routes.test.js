import { expect, it } from 'vitest';
import { routePose } from '../src/game/town/TownRoutes';
it('turns smoothly at a right-angle road junction while positions stay on the graph', () => {
  const route = [
    [0, 0],
    [0, 5],
    [5, 5],
  ];
  let last = routePose(route, 0);
  for (let distance = 0.05; distance <= 10; distance += 0.05) {
    const pose = routePose(route, distance);
    expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThanOrEqual(0.051);
    expect(Math.abs(pose.heading - last.heading)).toBeLessThan(0.15);
    expect(pose.x === 0 || pose.z === 5).toBe(true);
    expect(routePose(route, distance)).toEqual(pose);
    last = pose;
  }
  expect(routePose(route, 11)).toMatchObject({ x: 5, z: 5, moving: false });
});
