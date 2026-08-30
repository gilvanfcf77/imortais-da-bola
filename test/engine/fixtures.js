// Synthetic player/pool builders shared across engine tests. Deliberately
// doesn't touch src/data/clubs/ — engine tests should stay independent of
// real game data, both for speed and so a data change can't break a motor
// test that has nothing to do with it.

let nextId = 0;

export function makePlayer(position, overall = 70, traits = []) {
  nextId += 1;
  return { id: `test-${nextId}`, name: `Player ${nextId}`, position, overall, traits };
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
