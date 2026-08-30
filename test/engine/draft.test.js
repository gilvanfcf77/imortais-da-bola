import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, draftEleven, FORMATIONS } from '../../src/engine/index.js';
import { makePool } from './fixtures.js';

test('draftEleven respects every formation slot count', () => {
  const pool = makePool();
  for (const formation of Object.values(FORMATIONS)) {
    const lineup = draftEleven(pool, formation, createRng(1));
    assert.equal(lineup.length, 11);
    for (const slot of formation.slots) {
      const count = lineup.filter((p) => p.position === slot.position).length;
      assert.equal(count, slot.count, `${formation.name}: expected ${slot.count} ${slot.position}, got ${count}`);
    }
  }
});

test('draftEleven throws when a position has too few candidates', () => {
  const thinPool = [{ id: 'gk1', position: 'GK', overall: 70, traits: [] }];
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
