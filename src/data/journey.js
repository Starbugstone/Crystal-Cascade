import { CHAPTERS } from './campaign';
import { bonusCapacity, chestReward, grantReward } from './rewards';

const GIFTS = ['tnt', 'color-wand', 'clear-row', 'tile-breaker'];
export const chapterGift = (chapter) => chestReward(GIFTS[(chapter - 1) % GIFTS.length]);

export function journeyProgress(records) {
  const chapterIndex = CHAPTERS.findIndex((_, index) =>
    Array.from({ length: 6 }, (_, i) => index * 6 + i + 1).some((id) => !records[id]),
  );
  if (chapterIndex < 0) return null;
  const levels = Array.from({ length: 6 }, (_, i) => ({
    id: chapterIndex * 6 + i + 1,
    complete: !!records[chapterIndex * 6 + i + 1],
  }));
  return {
    chapter: chapterIndex + 1,
    name: CHAPTERS[chapterIndex].name,
    levels,
    remaining: levels.filter((level) => !level.complete).length,
    gift: chapterGift(chapterIndex + 1),
  };
}

export function grantChapterGift(state, chapter) {
  const gift = chapterGift(chapter);
  const slot = state.powers.find((power) => power.id === gift.id);
  // A full bag still gets a meaningful chapter gift; ordinary overflow stays compatible.
  return grantReward(
    state,
    slot.quantity >= bonusCapacity(state.town)
      ? {
          id: 'coins',
          kind: 'coins',
          label: 'Coins',
          quantity: chapter * 100,
          convertedFrom: gift.label,
        }
      : gift,
  );
}
