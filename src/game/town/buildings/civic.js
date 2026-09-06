export function addCivicDetails(d, parent, kind, level) {
  if (kind === 'blacksmith') {
    d.box(parent, 0.8, 3.5, 0.7, -1, 1.8, -0.8, '#8c6956');
    d.box(parent, 0.9, 0.85, 0.65, 1.7, 0.5, 0.6, '#5b625d');
    d.box(parent, 1.15, 0.2, 0.5, 1.7, 1, 0.6, '#737c76');
    d.box(parent, 0.5, 0.4, 0.12, -1, 0.55, 1.3, '#cd995a');
    if (level >= 2)
      for (let i = 0; i < level; i++)
        d.rod(
          parent,
          [-1.1 + i * 0.25, 0.6, 1.65],
          [-1.1 + i * 0.25, 1.15, 1.65],
          0.025,
          '#6d7771',
        );
    if (level >= 3) d.box(parent, 2, 0.12, 1.7, 1.65, 2.1, 0.5, '#927655');
    if (level >= 4)
      d.mesh(parent, 'cylinder', [0.55, 0.08, 0.55], [-2, 0.6, 0], '#9e845c').rotation.x =
        Math.PI / 2;
  }
  if (kind === 'school') {
    d.box(parent, 0.65, 0.55, 0.65, 0, 3.15, 0, '#c6b98e');
    d.mesh(parent, 'cone', [0.24, 0.26, 0.24], [0, 3.2, 0.4], '#b89c60');
    if (level >= 2) d.box(parent, 0.9, 0.7, 0.1, 1.8, 0.8, 1.6, '#50655a');
    if (level >= 3) d.box(parent, 0.85, 0.12, 0.85, 0, 3.5, 0, '#6d8982');
  }
  if (kind === 'doctor') {
    d.box(parent, 0.55, 0.55, 0.12, 0, 2.45, 1.42, '#e3dbc0');
    d.box(parent, 0.32, 0.09, 0.05, 0, 2.45, 1.5, '#537f74');
    d.box(parent, 0.09, 0.32, 0.05, 0, 2.45, 1.5, '#537f74');
    if (level >= 2) d.box(parent, 0.6, 0.65, 0.45, 1.9, 0.4, 0, '#889e87');
    if (level >= 3) d.box(parent, 2.8, 0.13, 1, 0, 1.9, 1.75, '#71978c');
  }
  if ((kind === 'school' || kind === 'doctor') && level >= 4) {
    d.box(parent, 1.4, 0.14, 0.9, -2, 0.1, -0.5, '#9b835e');
    for (let i = 0; i < level; i++)
      d.ball(parent, -2.5 + i * 0.25, 0.3, -0.5, [0.15, 0.18, 0.2], '#8a9b66');
  }
  if (level >= 5) d.box(parent, 2.8, 0.16, 0.2, 0, 0.22, 1.8, '#baaa87');
}
