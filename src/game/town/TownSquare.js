// A compact, static fountain shares the scenery batch; no water simulation or extra frame work.
export function buildTownSquare(d, parent, stage) {
  d.box(parent, 5.4, 0.12, 5.2, 0, 0.06, 0, '#c5b797');
  d.box(parent, 4.9, 0.035, 4.7, 0, 0.14, 0, '#dcccad');
  for (const x of [-2.6, 2.6]) d.box(parent, 0.16, 0.18, 5.2, x, 0.1, 0, '#aaa182');
  for (const z of [-2.5, 2.5]) d.box(parent, 5.3, 0.18, 0.16, 0, 0.1, z, '#aaa182');
  const fountain = d.group(parent);
  fountain.name = 'Town fountain';
  d.mesh(fountain, 'cylinder', [1.08, 0.16, 1.08], [0, 0.24, 0], '#aaa58f');
  d.mesh(fountain, 'cylinder', [0.97, 0.27, 0.97], [0, 0.4, 0], '#d2c9ad');
  d.mesh(fountain, 'cylinder', [0.81, 0.035, 0.81], [0, 0.54, 0], '#71b8bd');
  d.mesh(fountain, 'cylinder', [0.19, 0.48, 0.19], [0, 0.76, 0], '#b5b09b');
  if (stage >= 3) {
    d.mesh(fountain, 'cylinder', [0.49, 0.14, 0.49], [0, 1.02, 0], '#d2c9ad');
    d.mesh(fountain, 'cylinder', [0.4, 0.025, 0.4], [0, 1.1, 0], '#71b8bd');
  }
  d.ball(fountain, 0, 1.05, 0, 0.14, '#c9c1a2');
  for (let n = 0; n < 4; n++) {
    const angle = (n / 4) * Math.PI * 2;
    const points = [
      [0, 1.12],
      [0.18, 1.38],
      [0.44, 1.23],
      [0.66, 0.56],
    ].map(([radius, y]) => [Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    for (let i = 1; i < points.length; i++)
      d.rod(fountain, points[i - 1], points[i], 0.025, '#b8e1de');
  }
  if (stage >= 2) {
    for (const x of [-2.05, 2.05]) {
      for (const z of [-1.3, 1.3]) {
        const bench = d.group(parent, x, 0.15, z);
        for (const dz of [-0.4, 0.4]) d.box(bench, 0.35, 0.3, 0.09, 0, 0.15, dz, '#7c816c');
        d.box(bench, 0.48, 0.09, 1.15, 0, 0.35, 0, '#9f8157');
        d.box(bench, 0.08, 0.32, 1.15, Math.sign(x) * 0.23, 0.52, 0, '#b09061');
      }
    }
  }
  if (stage >= 4) {
    for (const x of [-1.5, 1.5])
      for (const z of [-2.1, 2.1]) {
        d.box(parent, 0.7, 0.18, 0.5, x, 0.25, z, '#9c9276');
        d.ball(parent, x, 0.38, z, [0.4, 0.16, 0.3], '#87a075');
        for (const dx of [-0.18, 0.18]) d.ball(parent, x + dx, 0.52, z, 0.09, '#d9a380');
      }
  }
  if (stage >= 5) {
    for (const z of [-1.8, 1.8]) {
      d.box(parent, 1.5, 0.03, 0.45, 0, 0.18, z, '#b69e72');
      for (const x of [-0.5, 0, 0.5]) d.box(parent, 0.25, 0.02, 0.25, x, 0.21, z, '#7b9c8e');
    }
  }
}
