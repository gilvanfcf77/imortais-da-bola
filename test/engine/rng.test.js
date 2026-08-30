import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../src/engine/index.js';

// The whole calibration workflow (CLAUDE.md "Motor de simulação") depends on
// this: same seed in, same sequence out, every time.
test('same seed produces the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('different seeds diverge', () => {
  const a = createRng(1);
  const b = createRng(2);
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('chance(0) is always false and chance(1) is always true', () => {
  const rng = createRng(7);
  for (let i = 0; i < 50; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
});

test('int(min, max) stays within bounds, inclusive', () => {
  const rng = createRng(3);
  for (let i = 0; i < 200; i++) {
    const n = rng.int(5, 10);
    assert.ok(n >= 5 && n <= 10, `${n} is out of [5, 10]`);
  }
});

test('pick returns an element from the list', () => {
  const rng = createRng(9);
  const list = ['a', 'b', 'c'];
  for (let i = 0; i < 30; i++) {
    assert.ok(list.includes(rng.pick(list)));
  }
});

test('pick on an empty list returns undefined', () => {
  const rng = createRng(9);
  assert.equal(rng.pick([]), undefined);
});

test('shuffle returns a same-size permutation without mutating the original', () => {
  const rng = createRng(11);
  const original = [1, 2, 3, 4, 5];
  const copy = [...original];
  const shuffled = rng.shuffle(original);
  assert.deepEqual(original, copy);
  assert.equal(shuffled.length, original.length);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test('pickWeighted with all-zero weights still returns a valid item', () => {
  const rng = createRng(13);
  const items = ['x', 'y', 'z'];
  assert.ok(items.includes(rng.pickWeighted(items, [0, 0, 0])));
});
