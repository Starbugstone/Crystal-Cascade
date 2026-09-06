// World-space lots leave room for level-three buildings, yards, and narrow dirt streets.
export const PLOTS = {
  home: [-7, -4],
  farm: [7, -4],
  well: [0, 2.4],
  square: [0, -5],
  saloon: [-7, 4],
  stable: [7, 4],
  sheriff: [0, 11],
  museum: [-7, 12],
  armory: [7, 12],
  mine: [0, -13],
  bank: [-7, -12],
  shop: [7, -12],
  home2: [-15, -4],
  home3: [-15, 4],
  home4: [-7, 20],
  well2: [7, 20],
  farm2: [15, -4],
  farm3: [15, 4],
};
export const LANE_X = 3.5;
export const atPlot = (id, dx = 0, dz = 0) => [PLOTS[id][0] + dx, PLOTS[id][1] + dz];
export const plotStreet = (id) => {
  const [x, z] = PLOTS[id];
  return x === 0 && id !== 'mine' ? [LANE_X, z + 2] : [x, z + (id === 'mine' ? 4.5 : 3.5)];
};
// The sheriff patrols both main streets, passing the bank, mine and department.
export const SHERIFF_PATROL = [
  plotStreet('sheriff'),
  [LANE_X, 15.5],
  [-LANE_X, 15.5],
  [-LANE_X, -8.5],
  [LANE_X, -8.5],
];
const road = (from, to, width = 0.85) => ({ from, to, width });
export const TOWN_TRACKS = [
  ...[-LANE_X, LANE_X].map((x) => road([x, -18], [x, 27], 1.05)),
  ...[-8.5, -0.5, 7.5, 15.5, 23.5].map((z) =>
    road([z === -0.5 || z === 7.5 ? -19 : -11, z], [z === -0.5 || z === 7.5 ? 19 : 11, z]),
  ),
  ...[-11, 11].map((x) => road([x, -8.5], [x, 7.5])),
  ...Object.keys(PLOTS).map((id) =>
    road(atPlot(id, 0, id === 'mine' ? 2.6 : 2), plotStreet(id), 0.75),
  ),
];
export function segmentDistance(x, z, from, to) {
  const dx = to[0] - from[0],
    dz = to[1] - from[1];
  const t = Math.max(
    0,
    Math.min(1, ((x - from[0]) * dx + (z - from[1]) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(x - from[0] - t * dx, z - from[1] - t * dz);
}
// One projection keeps the accessible SVG map's plots and dirt tracks together.
export const mapPoint = ([x, z]) => [500 + x * 24, 350 + z * 14];
