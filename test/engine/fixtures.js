// Synthetic player/pool builders shared across engine tests. Deliberately
// doesn't touch src/data/clubs/ — engine tests should stay independent of
// real game data, both for speed and so a data change can't break a motor
// test that has nothing to do with it.

let nextId = 0;

// Every specific role within a broad position, by default — see
// src/engine/formations.js's ROLE_TO_POSITION. Gives every fixture player
// the full set for their position unless `roles` is passed explicitly,
// which keeps existing tests' "any CB fills any CB-shaped slot" assumption
// working under the role-based draft too.
const DEFAULT_ROLES = {
  GK: ['GOL'],
  CB: ['ZAG'],
  FB: ['LE', 'LD'],
  MF: ['VOL', 'MC', 'ME', 'MD', 'MAT'],
  FW: ['PE', 'PD', 'CA'],
};

export function makePlayer(position, overall = 70, traits = [], roles) {
  nextId += 1;
  return { id: `test-${nextId}`, name: `Player ${nextId}`, position, overall, traits, roles: roles ?? DEFAULT_ROLES[position] };
}

// Generous enough per position that draftEleven can fill any FORMATIONS
// entry without throwing "not enough players".
export function makePool() {
  const pool = [];
  for (let i = 0; i < 6; i++) pool.push(makePlayer('GK'));
  for (let i = 0; i < 10; i++) pool.push(makePlayer('CB'));
  for (let i = 0; i < 10; i++) pool.push(makePlayer('FB'));
  for (let i = 0; i < 12; i++) pool.push(makePlayer('MF'));
  for (let i = 0; i < 12; i++) pool.push(makePlayer('FW'));
  return pool;
}
