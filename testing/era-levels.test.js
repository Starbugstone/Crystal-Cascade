import { describe, expect, it } from 'vitest';
import { BUILDINGS, BUILDING_BY_ID, createTown } from '../src/data/town';
import { eraBuildingLevel } from '../src/game/town/TownEras';
import {
  advanceConstruction,
  buildWithHammer,
  constructionRuns,
  finishConstruction,
  normalizeTown,
  purchase,
  upgradeOffer,
} from '../src/game/town/TownRules';

const settlement = () => {
  const town = createTown();
  town.era = 'river-rail';
  town.coins = 10000;
  for (const b of BUILDINGS.filter((b) => b.introducedEra === 'frontier'))
    town.buildings[b.id] = b.upgrades.length;
  return town;
};
describe('three explicit levels in River & Rail', () => {
  it.each(['saloon', 'well', 'bridge', 'railDepot', 'home5'])(
    'saves every %s tier at the agreed prices and rejects a stale purchase',
    (id) => {
      let town = settlement();
      town.buildings.bridge = id === 'home5' ? 1 : 0;
      const baseService = town.buildings[id];
      for (const [i, cost] of [800, 1200, 1400].entries()) {
        const offer = upgradeOffer(town, id);
        expect(offer.cost).toBe(cost);
        town = purchase(town, id, offer.stage);
        expect(constructionRuns(town.projects[id])).toBeLessThanOrEqual(2);
        town = normalizeTown(advanceConstruction(town));
        if (town.projects[id].wins < constructionRuns(town.projects[id]))
          town = advanceConstruction(town);
        town = finishConstruction(town, id, town.projects[id].stage);
        expect(eraBuildingLevel(town, id)).toBe(i + 1);
        expect(purchase(town, id, offer.stage)).toBeNull();
        expect(buildWithHammer(town, id, offer.stage)).toBeNull();
        town = normalizeTown(town);
        expect(eraBuildingLevel(town, id)).toBe(i + 1);
      }
      expect(upgradeOffer(town, id)).toBeNull();
      if (BUILDING_BY_ID[id].introducedEra === 'frontier')
        expect(town.buildings[id]).toBe(baseService);
    },
  );
  it('migrates an already modernized building to era level one without charging again', () => {
    const town = settlement();
    delete town.buildingEraLevels;
    town.buildingEras.saloon = 'river-rail';
    const restored = normalizeTown(town);
    expect(eraBuildingLevel(restored, 'saloon')).toBe(1);
    expect(upgradeOffer(restored, 'saloon')).toMatchObject({ eraLevel: 2, cost: 1200 });
    expect(restored.coins).toBe(town.coins);
  });
});
