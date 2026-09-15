// Unlike test/engine/*.test.js, this exercises a UI-adjacent helper
// (src/app/components/matchStats.js) rather than the engine itself — still
// pure, dependency-free functions, so plain node:test works the same way.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cupScorerLeaderboard, cupAssisterLeaderboard } from '../../src/app/components/matchStats.js';
import { EVENT_TYPES } from '../../src/engine/index.js';

function match(homeLineup, awayLineup, events) {
  return { homeLineup, awayLineup, events };
}

test('cupScorerLeaderboard ranks by goal count, most first', () => {
  const lineup = [
    { id: 'p1', name: 'One' },
    { id: 'p2', name: 'Two' },
  ];
  const matches = [
    match(lineup, [], [
      { type: EVENT_TYPES.GOAL, playerId: 'p1' },
      { type: EVENT_TYPES.GOAL, playerId: 'p1' },
      { type: EVENT_TYPES.GOAL, playerId: 'p2' },
    ]),
  ];
  const entries = cupScorerLeaderboard(matches);
  assert.deepEqual(
    entries.map((e) => [e.name, e.count]),
    [
      ['One', 2],
      ['Two', 1],
    ]
  );
});

// The user's actual request: when two or more players are tied for the top
// scorer spot, every one of them counts as a co-leader — CupOutcomeScreen's
// Leaderboard reads this same `entries[0].count` comparison to decide who
// gets the 🥇, so this locks in the data shape that fix depends on.
test('cupScorerLeaderboard leaves ties at the top intact, not arbitrarily broken', () => {
  const lineup = [
    { id: 'p1', name: 'One' },
    { id: 'p2', name: 'Two' },
    { id: 'p3', name: 'Three' },
  ];
  const matches = [
    match(lineup, [], [
      { type: EVENT_TYPES.GOAL, playerId: 'p1' },
      { type: EVENT_TYPES.GOAL, playerId: 'p1' },
      { type: EVENT_TYPES.GOAL, playerId: 'p2' },
      { type: EVENT_TYPES.GOAL, playerId: 'p2' },
      { type: EVENT_TYPES.GOAL, playerId: 'p3' },
    ]),
  ];
  const entries = cupScorerLeaderboard(matches);
  const topCount = entries[0].count;
  const tiedForTop = entries.filter((e) => e.count === topCount).map((e) => e.name).sort();

  assert.equal(topCount, 2);
  assert.deepEqual(tiedForTop, ['One', 'Two']);
});

test('cupAssisterLeaderboard only counts events with an assistPlayerId', () => {
  const lineup = [
    { id: 'p1', name: 'Scorer' },
    { id: 'p2', name: 'Assister' },
  ];
  const matches = [
    match(lineup, [], [
      { type: EVENT_TYPES.GOAL_ASSISTED, playerId: 'p1', assistPlayerId: 'p2' },
      { type: EVENT_TYPES.GOAL, playerId: 'p1' }, // unassisted — shouldn't count for anyone here
    ]),
  ];
  const entries = cupAssisterLeaderboard(matches);
  assert.deepEqual(entries, [{ id: 'p2', name: 'Assister', count: 1 }]);
});
