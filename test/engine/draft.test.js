import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRng,
  draftEleven,
  draftBestEleven,
  draftBestFormationEleven,
  FORMATIONS,
} from '../../src/engine/index.js';
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
      assert.equal(
        count,
        expected,
        `${formation.name}: expected ${expected} ${position}, got ${count}`,
      );
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
    lineupB.map((p) => p.id),
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
    `expected the versatile player's effective position to be CB or MF, got ${picked.position}`,
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
    assert.ok(
      rivellinoCount <= 1,
      `seed ${seed}: expected at most 1 'rivellino' entry, got ${rivellinoCount}`,
    );
  }
});

// draftEleven backs the player's own "complete automatically" button
// (completeSquadRandomly in src/app/actions.js) and must stay a genuine,
// unweighted sorteio — the user explicitly asked that it not skew toward
// stronger players, unlike draftBestEleven below. With one strong (99) and
// one weak (50) candidate for the same slot, the weak one missing across 100
// independent seeds would only happen by chance about 1 in 2^100 times if
// the pick were truly uniform — so its absence here would mean the draft
// secretly favors overall.
test('draftEleven does not skew toward the higher-overall candidate', () => {
  const strong = makePlayer('GK', 99);
  const weak = makePlayer('GK', 50);
  const pool = [strong, weak, ...makePool()];

  let weakPicked = false;
  for (let seed = 0; seed < 100; seed++) {
    const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(seed));
    const gk = lineup.find((p) => p.position === 'GK');
    if (gk.id === weak.id) weakPicked = true;
  }
  assert.ok(weakPicked, 'expected the weaker goalkeeper to be drafted at least once in 100 seeds');
});

test('draftBestEleven respects every formation slot', () => {
  const pool = makePool();
  for (const formation of Object.values(FORMATIONS)) {
    const lineup = draftBestEleven(pool, formation, createRng(1));
    assert.equal(lineup.length, formation.slots.length);
  }
});

test('draftBestEleven never picks the same player twice', () => {
  const pool = makePool();
  const lineup = draftBestEleven(pool, FORMATIONS['4-4-2'], createRng(17));
  const ids = lineup.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

// The whole point of draftBestEleven: the cup opponent should always field
// that era's actual strongest lineup, never a weaker alternative — see the
// user's request that "o time adversário do jogador venha com força máxima".
test('draftBestEleven always picks the highest-overall eligible candidate for a slot', () => {
  const weak = makePlayer('GK', 50);
  const strong = makePlayer('GK', 99);
  const pool = [weak, strong, ...makePool()];

  for (let seed = 0; seed < 20; seed++) {
    const lineup = draftBestEleven(pool, FORMATIONS['4-4-2'], createRng(seed));
    const gk = lineup.find((p) => p.position === 'GK');
    assert.equal(
      gk.id,
      strong.id,
      `seed ${seed}: expected the overall-99 goalkeeper, got overall ${gk.overall}`,
    );
  }
});

// Two candidates tied on overall for the same slot must still resolve to
// exactly one of them (not both crash the draft, not silently drop the
// slot) — ties are broken randomly rather than always favoring whichever one
// happens to come first in the data file.
test('draftBestEleven breaks a tie between equal-overall candidates', () => {
  const tiedA = makePlayer('GK', 90);
  const tiedB = makePlayer('GK', 90);
  const pool = [tiedA, tiedB, ...makePool()];

  const seen = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const lineup = draftBestEleven(pool, FORMATIONS['4-4-2'], createRng(seed));
    const gk = lineup.find((p) => p.position === 'GK');
    assert.ok(gk.id === tiedA.id || gk.id === tiedB.id);
    seen.add(gk.id);
  }
  assert.equal(seen.size, 2, 'expected both tied candidates to come up across 30 seeds');
});

test('draftBestEleven is deterministic for a given seed', () => {
  const pool = makePool();
  const lineupA = draftBestEleven(pool, FORMATIONS['4-4-2'], createRng(99));
  const lineupB = draftBestEleven(pool, FORMATIONS['4-4-2'], createRng(99));
  assert.deepEqual(
    lineupA.map((p) => p.id),
    lineupB.map((p) => p.id),
  );
});

test("draftBestFormationEleven returns a lineup matching the chosen formation's slot count", () => {
  const pool = makePool();
  const { formation, lineup } = draftBestFormationEleven(pool, FORMATIONS, createRng(1));
  assert.ok(Object.values(FORMATIONS).includes(formation));
  assert.equal(lineup.length, formation.slots.length);
});

// The whole point of draftBestFormationEleven: it shouldn't just take the
// best 11 under a fixed formation, it should pick whichever formation
// extracts the most total quality from this specific pool — see the user's
// request that "se o time tem 2 CAs muito fortes, faz sentido usar uma
// formação com 2 CAs". Built here with a pool whose wide forwards (PE/PD,
// used by 4-2-4/4-3-3) are far stronger than its wide midfielders (ME/MD,
// used only by 4-4-2), so 4-2-4 should come out ahead — a minimal,
// hand-built pool (not makePool()) so no other candidate can dilute the
// deliberately weak ME/MD or deliberately strong PE/PD picks.
test('draftBestFormationEleven picks the formation with the highest total overall', () => {
  const pool = [
    makePlayer('GK', 70, [], ['GOL']),
    makePlayer('CB', 70, [], ['ZAG']),
    makePlayer('CB', 70, [], ['ZAG']),
    makePlayer('FB', 70, [], ['LE', 'LD']),
    makePlayer('FB', 70, [], ['LE', 'LD']),
    makePlayer('MF', 70, [], ['VOL']),
    makePlayer('MF', 70, [], ['MC']),
    makePlayer('MF', 50, [], ['ME']),
    makePlayer('MF', 50, [], ['MD']),
    makePlayer('MF', 50, [], ['MAT']),
    makePlayer('FW', 70, [], ['CA']),
    makePlayer('FW', 70, [], ['CA']),
    makePlayer('FW', 95, [], ['PE']),
    makePlayer('FW', 95, [], ['PD']),
  ];

  const { formation } = draftBestFormationEleven(pool, FORMATIONS, createRng(1));
  assert.equal(formation.name, '4-2-4');
});
