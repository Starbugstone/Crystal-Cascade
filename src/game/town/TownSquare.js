// Keep the center open and every addition below a seated person's height.
export function buildTownSquare(d, parent, stage) {
  d.box(parent, 5.4, 0.12, 5.2, 0, 0.06, 0, '#c5b797');
  d.box(parent, 4.9, 0.035, 4.7, 0, 0.14, 0, '#dcccad');
  for (const x of [-2.6, 2.6]) d.box(parent, 0.16, 0.18, 5.2, x, 0.1, 0, '#aaa182');
  for (const z of [-2.5, 2.5]) d.box(parent, 5.3, 0.18, 0.16, 0, 0.1, z, '#aaa182');
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
  if (stage >= 3) {
    const mosaic = d.mesh(parent, 'cylinder', [0.85, 0.02, 0.85], [0, 0.17, 0], '#b29f77');
    mosaic.rotation.y = Math.PI / 4;
    d.box(parent, 0.75, 0.025, 0.75, 0, 0.19, 0, '#73938c').rotation.y = Math.PI / 4;
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
