import { renderFrontierBuilding } from './frontier';
import { addCivicDetails } from './civic';
import { addFishingDock } from './river';
import { renderBridge, addStationDetails } from './infrastructure';
import { RIVER_RAIL_VARIANTS } from '../../../data/riverRail';
import { t } from '../../../i18n';

const kinds = {
  riverPort: 'fisherman',
  railDepot: 'museum',
  post: 'shop',
  warehouse: 'armory',
  hotel: 'saloon',
  market: 'shop',
};
export function renderBuilding({
  town: d,
  parent,
  kind,
  level,
  era = 'frontier',
  construction = false,
  label,
}) {
  if (kind === 'bridge') return renderBridge(d, parent, level > 0);
  renderFrontierBuilding(d, parent, kinds[kind] ?? kind, level, label, construction);
  if (construction) return;
  if (['blacksmith', 'school', 'doctor'].includes(kind)) addCivicDetails(d, parent, kind, level);
  if (kind === 'fisherman' || kind === 'riverPort')
    addFishingDock(d, parent, level, kind === 'riverPort');
  if (kind === 'railDepot') addStationDetails(d, parent);
  if (era !== 'frontier') renderModernization(d, parent, kind, era);
}
export function renderModernization(d, parent, kind, era) {
  if (era !== 'river-rail' || !RIVER_RAIL_VARIANTS[kind]) return;
  const colors = {
    home: '#ad8e79',
    farm: '#ad795c',
    well: '#8b9b96',
    saloon: '#bb9c78',
    stable: '#a18e6c',
    sheriff: '#899c98',
    bank: '#aaa28b',
    shop: '#ac937b',
    museum: '#b6a78b',
    armory: '#8c9990',
    square: '#aeab90',
    blacksmith: '#976f57',
    fisherman: '#849b91',
    school: '#beaa85',
    doctor: '#9daa9b',
  };
  if (kind === 'square') {
    for (const x of [-2.3, 2.3]) {
      d.rod(parent, [x, 0, -2], [x, 2.3, -2], 0.05, '#69766c');
      d.box(parent, 0.25, 0.35, 0.25, x, 2.35, -2, '#ebd2a0');
    }
    return;
  }
  if (kind === 'well') {
    d.rod(parent, [1.1, 0.2, 0.4], [1.1, 1.5, 0.4], 0.08, '#81918b');
    d.rod(parent, [1.1, 1.5, 0.4], [0.6, 1.5, 0.4], 0.08, '#81918b');
    return;
  }
  for (const x of [-1.47, 1.47]) {
    d.box(parent, 0.25, 1.9, 0.3, x, 1.02, 1.4, colors[kind]);
    for (let n = 0; n < 6; n++) d.box(parent, 0.27, 0.045, 0.32, x, 0.2 + n * 0.3, 1.4, '#d2c3a3');
  }
  d.box(parent, 3.25, 0.17, 0.95, 0, 2.05, 1.65, '#738f87');
  d.box(parent, 3.2, 0.22, 2.7, 0, 0.13, 0, colors[kind]);
  d.sign(parent, t(RIVER_RAIL_VARIANTS[kind][0]), 2.65, 0, 2.5, 1.6);
  if (kind === 'fisherman') d.box(parent, 2.8, 0.15, 1.5, 3, 0.15, 0, '#889c90');
}
