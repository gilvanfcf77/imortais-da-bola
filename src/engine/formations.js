// Formation definitions. Each slot says how many players of a given position
// the draft must pick for that formation. Position codes:
//   GK = goalkeeper, CB = center back, FB = fullback,
//   MF = midfielder, FW = forward.

export const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    slots: [
      { position: 'GK', count: 1 },
      { position: 'CB', count: 2 },
      { position: 'FB', count: 2 },
      { position: 'MF', count: 4 },
      { position: 'FW', count: 2 },
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { position: 'GK', count: 1 },
      { position: 'CB', count: 2 },
      { position: 'FB', count: 2 },
      { position: 'MF', count: 3 },
      { position: 'FW', count: 3 },
    ],
  },
  '4-2-4': {
    name: '4-2-4',
    slots: [
      { position: 'GK', count: 1 },
      { position: 'CB', count: 2 },
      { position: 'FB', count: 2 },
      { position: 'MF', count: 2 },
      { position: 'FW', count: 4 },
    ],
  },
};

export function totalPlayers(formation) {
  return formation.slots.reduce((sum, slot) => sum + slot.count, 0);
}
