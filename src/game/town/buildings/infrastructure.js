export function renderBridge(d, parent, built) {
  if (!built) {
    for (const x of [-6, 6]) d.box(parent, 0.22, 1, 0.22, x, 0.5, 0, '#b1976c');
    return;
  }
  for (let i = 0; i < 56; i++) d.box(parent, 0.24, 0.2, 2.3, -7 + i * 0.25, 0.16, 0, '#a48e69');
  for (const z of [-1.12, 1.12]) {
    d.rod(parent, [-7, 1, z], [7, 1, z], 0.07, '#646e66');
    for (let x = -7; x <= 7; x++) d.rod(parent, [x, -0.05, z], [x, 1, z], 0.045, '#677269');
    for (const x of [-5, 0, 5]) d.box(parent, 0.45, 1.5, 0.45, x, -0.5, z, '#8c9183');
  }
}
export function addStationDetails(d, parent) {
  d.box(parent, 6, 0.22, 1.8, 0, 0.17, -2.4, '#b5a27e');
  d.box(parent, 5.8, 0.15, 1.6, 0, 2.3, -2.3, '#728a82');
  for (const x of [-2.6, 2.6]) d.rod(parent, [x, 0.2, -2.4], [x, 2.3, -2.4], 0.065, '#a58d61');
  d.ball(parent, 0, 2.5, 1.5, [0.22, 0.22, 0.06], '#efe1b6');
}
