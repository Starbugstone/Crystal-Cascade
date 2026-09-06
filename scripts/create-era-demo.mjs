// Developer fixtures only. Never imported by the game or served from public/.
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BUILDINGS, BANDIT_EVENT, createTown } = await server.ssrLoadModule('/src/data/town.js');
  const { CHAPTERS } = await server.ssrLoadModule('/src/data/campaign.js');
  const { advanceEra } = await server.ssrLoadModule('/src/game/town/TownEras.js');
  const { buildWithHammer } = await server.ssrLoadModule('/src/game/town/TownRules.js');
  const { SAVE_KEY } = await server.ssrLoadModule('/src/services/localProfile.js');
  const town = createTown();
  const completed = (CHAPTERS.findIndex((chapter) => chapter.id === 'river-discovery') + 1) * 6;
  Object.assign(town, {
    coins: 30000,
    completedRuns: completed,
    tourSeen: true,
    constructionTipSeen: true,
  });
  for (const building of BUILDINGS.filter((b) => b.introducedEra === 'frontier'))
    town.buildings[building.id] = building.upgrades.length;
  town.forge.charge = 1;
  town.events[BANDIT_EVENT] = {
    id: 1,
    atRun: completed,
    gangSize: 10,
    sheriffLevel: 5,
    bankLevel: 5,
    outcome: 'protected',
    loss: 0,
    seen: true,
    targets: ['mine'],
  };
  const records = Object.fromEntries(
    Array.from({ length: completed }, (_, i) => [i + 1, { score: 100, stars: 1 }]),
  );
  const riverRail = advanceEra(town, records, 'frontier');
  let complete = {
    ...riverRail,
    transition: { ...riverRail.transition, pending: false },
    eraTransitionSeen: { 'river-rail': true },
  };
  for (const b of BUILDINGS.filter((b) => b.introducedEra === 'frontier'))
    complete = buildWithHammer(complete, b.id, 5);
  for (const id of [
    'bridge',
    'riverPort',
    'railDepot',
    'post',
    'warehouse',
    'hotel',
    'home5',
    'market',
  ])
    complete = buildWithHammer(complete, id, 0);
  const directory = 'output/era-demo';
  await mkdir(directory, { recursive: true });
  for (const [name, state] of Object.entries({
    'frontier-ready': town,
    'river-rail': riverRail,
    'river-rail-complete': complete,
  })) {
    const profile = JSON.stringify({
      schemaVersion: 2,
      town: state,
      records,
      issuedRun: completed,
      settledRun: completed,
    });
    await writeFile(`${directory}/${name}.json`, `${profile}\n`);
    await writeFile(
      `${directory}/${name}.console.js`,
      `// Replaces progress on this origin. Use a disposable browser profile.\nlocalStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(profile)});\nlocation.reload();\n`,
    );
  }
  console.log(
    `Created three disposable profiles in ${directory}/. See docs/settlement-eras.md for testing steps.`,
  );
} finally {
  await server.close();
}
