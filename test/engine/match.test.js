import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, draftEleven, FORMATIONS, simulateMatch, resolvePenaltyShootout, EVENT_TYPES } from '../../src/engine/index.js';
import { makePool } from './fixtures.js';

function makeTeams(seed) {
  const pool = makePool();
  const rng = createRng(seed);
  const home = { name: 'Home', lineup: draftEleven(pool, FORMATIONS['4-4-2'], rng), posture: 'balanced', gamesmanship: 1 };
  const away = { name: 'Away', lineup: draftEleven(pool, FORMATIONS['4-4-2'], rng), posture: 'balanced', gamesmanship: 1 };
  return { home, away, rng };
}

// The whole point of a seeded RNG (CLAUDE.md "Motor de simulação") is that
// re-running the same seed after tweaking a constant tells you the tweak
// caused the difference, not chance. If simulateMatch stopped being
// deterministic, that whole calibration workflow would quietly stop working.
test('simulateMatch is deterministic for the same seed', () => {
  const a = makeTeams(123);
  const resultA = simulateMatch({ home: a.home, away: a.away, rng: a.rng });
  const b = makeTeams(123);
  const resultB = simulateMatch({ home: b.home, away: b.away, rng: b.rng });

  assert.equal(resultA.homeGoals, resultB.homeGoals);
  assert.equal(resultA.awayGoals, resultB.awayGoals);
  assert.deepEqual(
    resultA.events.map((e) => e.type),
    resultB.events.map((e) => e.type)
  );
});

test('simulateMatch produces non-negative integer scores', () => {
  const { home, away, rng } = makeTeams(5);
  const result = simulateMatch({ home, away, rng });
  assert.ok(Number.isInteger(result.homeGoals) && result.homeGoals >= 0);
  assert.ok(Number.isInteger(result.awayGoals) && result.awayGoals >= 0);
});

test('simulateMatch always starts with kickoff and ends with fulltime', () => {
  const { home, away, rng } = makeTeams(8);
  const result = simulateMatch({ home, away, rng });
  assert.equal(result.events[0].type, EVENT_TYPES.KICKOFF);
  assert.equal(result.events.at(-1).type, EVENT_TYPES.FULLTIME);
});

test('per-side stats add up to the aggregate totals', () => {
  const { home, away, rng } = makeTeams(21);
  const result = simulateMatch({ home, away, rng });
  assert.equal(result.stats.foulsBySide.home + result.stats.foulsBySide.away, result.stats.fouls);
  assert.equal(result.stats.yellowCardsBySide.home + result.stats.yellowCardsBySide.away, result.stats.yellowCards);
  assert.equal(result.stats.redCardsBySide.home + result.stats.redCardsBySide.away, result.stats.redCards);
});

// The whole reason a shootout exists (see resolvePenaltyShootout's own doc
// comment in match.js) is to guarantee a winner — sudden death keeps going
// until the tie breaks, so this should never fail across any seed.
test('resolvePenaltyShootout never ends in a tie', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const pool = makePool();
    const rng = createRng(seed);
    const home = { name: 'Home', lineup: draftEleven(pool, FORMATIONS['4-4-2'], rng) };
    const away = { name: 'Away', lineup: draftEleven(pool, FORMATIONS['4-4-2'], rng) };
    const shootout = resolvePenaltyShootout({ home, away, rng, startMinute: 91 });

    assert.notEqual(shootout.homeScore, shootout.awayScore, `tied at seed ${seed}`);
    assert.ok(shootout.winnerSide === 'home' || shootout.winnerSide === 'away');
    assert.equal(shootout.winnerSide === 'home', shootout.homeScore > shootout.awayScore);
  }
});
