import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTraitIntensity,
  sumTraitIntensity,
  combineMultipliers,
  defaultGamesmanship,
} from '../../src/engine/index.js';

test('getTraitIntensity returns 0 when the player lacks the trait', () => {
  const player = { traits: [{ slug: 'sharpshooter', intensity: 2 }] };
  assert.equal(getTraitIntensity(player, 'wall'), 0);
});

test('getTraitIntensity returns the intensity when present', () => {
  const player = { traits: [{ slug: 'sharpshooter', intensity: 2 }] };
  assert.equal(getTraitIntensity(player, 'sharpshooter'), 2);
});

test('getTraitIntensity handles a player with no traits field at all', () => {
  assert.equal(getTraitIntensity({}, 'wall'), 0);
});

test('sumTraitIntensity adds intensity across players', () => {
  const players = [
    { traits: [{ slug: 'cynicalFouler', intensity: 2 }] },
    { traits: [{ slug: 'cynicalFouler', intensity: 1 }] },
    { traits: [] },
  ];
  assert.equal(sumTraitIntensity(players, 'cynicalFouler'), 3);
});

test('combineMultipliers multiplies and respects the cap', () => {
  assert.equal(combineMultipliers([2, 2], 10), 4);
  assert.equal(combineMultipliers([2, 2, 2], 3), 3); // 8 clamped down to 3
});

test('defaultGamesmanship is 0 for a squad with no cynicalFouler', () => {
  const squad = Array.from({ length: 11 }, () => ({ traits: [] }));
  assert.equal(defaultGamesmanship(squad), 0);
});

test('defaultGamesmanship always stays within 0-3', () => {
  const squad = Array.from({ length: 11 }, () => ({
    traits: [{ slug: 'cynicalFouler', intensity: 3 }],
  }));
  const level = defaultGamesmanship(squad);
  assert.ok(level >= 0 && level <= 3, `${level} outside [0, 3]`);
});
