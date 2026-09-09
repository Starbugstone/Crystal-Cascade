// Old receipts without a kind remain Frontier raids, even after an era update.
export const eventKind = (event) => event?.kind ?? 'bandits';
export const eraEventKind = (era) =>
  ['industrial', 'motor-age'].includes(era)
    ? 'workshop-fire'
    : era === 'river-rail'
      ? 'cargo-theft'
      : 'bandits';
export const fireProtection = (level = 0) => [0, 2 / 3, 5 / 6, 1][Math.min(3, Math.max(0, level))];
export const eventHeading = (event) =>
  ({
    bandits: 'FRONTIER ENCOUNTER',
    'cargo-theft': 'CARGO THEFT',
    'workshop-fire': 'WORKSHOP FIRE',
  })[eventKind(event)];
export const incidentPhases = (kind, time) =>
  kind === 'workshop-fire'
    ? time < 6
      ? 'Smoke at the workshop'
      : time < 14
        ? 'The brigade is responding'
        : 'The workshop is safe'
    : time < 6
      ? 'Thieves near the freight yard'
      : time < 14
        ? 'The town patrol responds'
        : 'The cargo is accounted for';
export const incidentStory = (event) =>
  eventKind(event) === 'workshop-fire'
    ? {
        speaker: 'Ada · the caretaker',
        title: event.loss ? 'A small workshop fire' : 'The brigade kept the town safe',
        text: event.loss
          ? 'Cleanup cost {coins} coins. Every building is intact. Upgrade the fire station to protect more of your savings.'
          : 'The fire brigade protected every coin. The workshop is safe and every building stays open.',
      }
    : {
        speaker: 'Sam · the sheriff',
        title: event.loss ? 'Trouble at the freight yard' : 'The cargo is safe',
        text: event.loss
          ? 'Cargo thieves took {coins} coins. Upgrade the police and bank to protect your savings.'
          : 'The town patrol secured the cargo. Every coin is safe.',
      };
