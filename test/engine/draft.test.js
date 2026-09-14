import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, draftEleven, FORMATIONS } from '../../src/engine/index.js';
import { makePool, makePlayer } from './fixtures.js';

test('draftEleven respects every formation slot', () => {
  const pool = makePool();
  for (const formation of Object.values(FORMATIONS)) {
    const lineup = draftEleven(pool, formation, createRng(1));
    assert.equal(lineup.length, formation.slots.length);

    const expectedByPosition = {};
    for (const slot of formation.slots) {
      expectedByPosition[slot.position] = (expectedByPosition[slot.position] ?? 0) + 1;
    }
    for (const [position, expected] of Object.entries(expectedByPosition)) {
      const count = lineup.filter((p) => p.position === position).length;
      assert.equal(count, expected, `${formation.name}: expected ${expected} ${position}, got ${count}`);
    }
  }
});

test('draftEleven throws when a position has too few candidates', () => {
  const thinPool = [makePlayer('GK')];
  assert.throws(() => draftEleven(thinPool, FORMATIONS['4-4-2'], createRng(1)));
});

test('draftEleven is deterministic for a given seed', () => {
  const pool = makePool();
  const lineupA = draftEleven(pool, FORMATIONS['4-4-2'], createRng(99));
  const lineupB = draftEleven(pool, FORMATIONS['4-4-2'], createRng(99));
  assert.deepEqual(
    lineupA.map((p) => p.id),
    lineupB.map((p) => p.id)
  );
});

test('draftEleven never picks the same player twice', () => {
  const pool = makePool();
  const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(17));
  const ids = lineup.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

// The whole point of storing `roles` instead of a single fixed position: a
// player whose roles span two different broad positions (a ZAG who's also
// a VOL) must be eligible for either kind of slot, and the one they land in
// decides their effective `position` for the match — not their data file's
// default.
test('draftEleven lets a player with cross-position roles fill either kind of slot', () => {
  const versatile = makePlayer('CB', 80, [], ['ZAG', 'VOL']);
  // Enough plain CB/MF slack that the formation's slots (2 ZAG, 4 MF roles
  // in the 4-4-2) are fillable no matter which side `versatile` lands on.
  const pool = [
    versatile,
    makePlayer('GK'),
    makePlayer('CB'),
    makePlayer('CB'),
    makePlayer('FB'),
    makePlayer('FB'),
    makePlayer('MF'),
    makePlayer('MF'),
    makePlayer('MF'),
    makePlayer('MF'),
    makePlayer('FW'),
    makePlayer('FW'),
  ];

  const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(1));
  const picked = lineup.find((p) => p.id === versatile.id);
  assert.ok(picked, 'the versatile player should have been drafted');
  assert.ok(
    picked.position === 'CB' || picked.position === 'MF',
    `expected the versatile player's effective position to be CB or MF, got ${picked.position}`
  );
});

// A real player can have one entry per club era (different `id`s), but the
// draft must still treat them as one person — see PROGRESSO.md on real
// clubs mixing eras in a single pool.
test('draftEleven never drafts the same person twice across era entries', () => {
  const pool = makePool();
  const eraEntryA = makePlayer('CB', 80, [], ['ZAG'], 'rivellino');
  const eraEntryB = makePlayer('MF', 80, [], ['VOL'], 'rivellino');
  const poolWithRepeatedPerson = [...pool, eraEntryA, eraEntryB];

  for (let seed = 0; seed < 30; seed++) {
    const lineup = draftEleven(poolWithRepeatedPerson, FORMATIONS['4-4-2'], createRng(seed));
    const rivellinoCount = lineup.filter((p) => p.personId === 'rivellino').length;
    assert.ok(rivellinoCount <= 1, `seed ${seed}: expected at most 1 'rivellino' entry, got ${rivellinoCount}`);
  }
});
