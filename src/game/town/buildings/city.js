import { CITY_FAMILIES, isCityEra } from '../../../data/city';
import { blenderModel, leisureModel } from '../LeisureAssets';
import { buildTownSquare } from '../TownSquare';
import assets from '../../../assets/city-meshes.json';

export const cityModel = (d, parent, name) => blenderModel(d, parent, assets, name, 'city');

// Meshes are shared architectural pieces exported from Blender, not per-plot copies.
export function renderCityBuilding(d, parent, kind, label, level, era, serviceLevel = 3) {
  if (!isCityEra(era) || !CITY_FAMILIES[kind] || kind === 'bridge') return false;
  const family = CITY_FAMILIES[kind];
  const root = d.group(parent);
  root.name = `${era} ${kind} level ${level}`;
  if (kind === 'horseField' || kind === 'park') {
    leisureModel(d, root, `${kind === 'horseField' ? 'field' : 'park'}${serviceLevel}`);
    cityModel(d, root, `${era}-garden`);
  } else if (family === 'square') {
    buildTownSquare(d, root, serviceLevel);
    cityModel(d, root, `${era}-garden`);
  } else cityModel(d, root, `${era}-${family}`);
  const garden = ['field', 'park', 'square'].includes(family);
  if (level >= 2) cityModel(d, root, `${era}-${garden ? 'finish' : 'wing'}`);
  if (level >= 3) {
    const detail = cityModel(d, root, `${era}-finish`);
    if (garden) {
      detail.rotation.y = Math.PI;
      detail.position.z = -0.3;
    }
  }
  if (['doctor', 'sheriff', 'bank', 'blacksmith'].includes(kind))
    cityModel(d, root, `marker-${kind}`);
  d.sign(root, label, 2.9, 0, 2.8, 1.8);
  return true;
}
export function addCityModernization(d, parent, kind, era, level) {
  if (kind !== 'bridge' || !isCityEra(era)) return;
  const root = cityModel(d, parent, `${era}-bridge`);
  root.name = `${era} bridge approaches ${level}`;
  if (level >= 2) {
    const garden = cityModel(d, parent, `${era}-finish`);
    garden.position.x = -6;
    garden.scale.set(0.55, 0.8, 0.65);
  }
  if (level >= 3) {
    const garden = cityModel(d, parent, `${era}-finish`);
    garden.position.x = 6;
    garden.scale.set(0.55, 0.8, 0.65);
  }
}
