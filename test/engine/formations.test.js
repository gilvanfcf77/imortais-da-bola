import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS, totalPlayers } from '../../src/engine/index.js';

for (const [name, formation] of Object.entries(FORMATIONS)) {
  test(`${name} has exactly 11 players total`, () => {
    assert.equal(totalPlayers(formation), 11);
  });

  test(`${name} has exactly one goalkeeper slot`, () => {
    const gkSlots = formation.slots.filter((s) => s.position === 'GK');
    assert.equal(gkSlots.length, 1);
    assert.equal(gkSlots[0].role, 'GOL');
  });
}
