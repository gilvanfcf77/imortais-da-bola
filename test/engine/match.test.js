import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, draftEleven, FORMATIONS, simulateMatch, resolvePenaltyShootout, EVENT_TYPES } from '../../src/engine/index.js';
import { makePool, makePlayer } from './fixtures.js';

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

// A specialAbility can carry an optional `minLead` (see Edílson's
// embaixadinhas in corinthians/2000.json) gating it to only roll once the
// team is ahead by that many goals. An unreachable minLead should suppress
// it entirely, even with chancePerMinute maxed out.
test('a specialAbility with an unreachable minLead never fires', () => {
  const pool = makePool();
  const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(5));
  const withAbility = {
    ...lineup[0],
    specialAbility: { minLead: 99, chancePerMinute: 1, templates: ['{player} shows off for {team}.'] },
  };
  const home = { name: 'Home', lineup: [withAbility, ...lineup.slice(1)], posture: 'balanced', gamesmanship: 0 };
  const away = { name: 'Away', lineup: draftEleven(pool, FORMATIONS['4-4-2'], createRng(6)), posture: 'balanced', gamesmanship: 0 };
  const result = simulateMatch({ home, away, rng: createRng(7) });

  assert.equal(result.stats.specialAbilities, 0);
});

// Without a `minLead`, a specialAbility keeps rolling every minute regardless
// of score, same as before that field existed.
test('a specialAbility with no minLead can fire regardless of score', () => {
  const pool = makePool();
  const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(5));
  const withAbility = {
    ...lineup[0],
    specialAbility: { chancePerMinute: 1, templates: ['{player} shows off for {team}.'] },
  };
  const home = { name: 'Home', lineup: [withAbility, ...lineup.slice(1)], posture: 'balanced', gamesmanship: 0 };
  const away = { name: 'Away', lineup: draftEleven(pool, FORMATIONS['4-4-2'], createRng(6)), posture: 'balanced', gamesmanship: 0 };
  const result = simulateMatch({ home, away, rng: createRng(7) });

  assert.ok(result.stats.specialAbilities > 0);
});

// A specialAbility with no `conversionMultiplier` is pure flavor — it must
// never itself put a goal on the board (see Edílson's embaixadinhas, which
// shouldn't manufacture a scoring chance out of a showboating moment).
test('a specialAbility with no conversionMultiplier never scores on its own', () => {
  const pool = makePool();
  const lineup = draftEleven(pool, FORMATIONS['4-4-2'], createRng(5));
  const withAbility = {
    ...lineup[0],
    specialAbility: { chancePerMinute: 1, templates: ['{player} shows off for {team}.'] },
  };
  const home = { name: 'Home', lineup: [withAbility, ...lineup.slice(1)], posture: 'balanced', gamesmanship: 0 };
  const away = { name: 'Away', lineup: draftEleven(pool, FORMATIONS['4-4-2'], createRng(6)), posture: 'balanced', gamesmanship: 0 };
  const result = simulateMatch({ home, away, rng: createRng(7) });

  // Isolates goals produced by the special-ability resolution itself (which
  // immediately follows its own PLAYER_SPECIAL event, same minute, same
  // player) from any ordinary goal this player might separately score
  // through normal play elsewhere in the match — only the former is what
  // "no conversionMultiplier" is supposed to rule out.
  const specialEvents = result.events.filter(
    (e) => e.type === EVENT_TYPES.PLAYER_SPECIAL && e.playerId === withAbility.id
  );
  assert.ok(specialEvents.length > 0, 'expected the ability to have fired at least once');
  for (const special of specialEvents) {
    const index = result.events.indexOf(special);
    const next = result.events[index + 1];
    const followedByBonusShot =
      next &&
      next.minute === special.minute &&
      next.playerId === withAbility.id &&
      (next.type === EVENT_TYPES.GOAL || next.type === EVENT_TYPES.CHANCE_MISSED);
    assert.ok(!followedByBonusShot, `PLAYER_SPECIAL at minute ${special.minute} was followed by a bonus-shot event`);
  }
});

// A goalkeeper never takes a corner — see the 'corner' branch in
// resolveAttack (match.js). Before this was fixed, a keeper with a high
// freeKickSpecialist intensity (e.g. Rogério Ceni, who in real life only
// took frontal free kicks and penalties, never corners) could get weighted
// so heavily that they'd be credited with taking every corner that led to a
// goal. Stacks the odds against the fix on purpose — a tiny squad where the
// keeper has max playmaker+freeKickSpecialist and every outfield player has
// none, over many simulated matches — so if the exclusion regressed, this
// would catch it almost immediately rather than relying on a rare natural
// occurrence. Unlike a corner, an 'assisted' open-play goal genuinely can
// have the goalkeeper credited (a long clearance/throw) — just rarely (see
// GOALKEEPER_ASSIST_WEIGHT) — so this test only checks GOAL_CORNER events,
// not every event with an assistPlayerId.
test('a goalkeeper never takes a corner, even with max playmaker/freeKickSpecialist', () => {
  const keeper = makePlayer('GK', 90, [
    { slug: 'playmaker', intensity: 3 },
    { slug: 'freeKickSpecialist', intensity: 3 },
  ]);
  // Every other role stays generic (makePool()'s usual fixtures), but the
  // only GK-eligible candidate is the stacked keeper above — otherwise
  // draftEleven's uniform pick could just as easily start one of the
  // ordinary goalkeepers instead, making the check meaningless most seeds.
  const lineupPool = [keeper, ...makePool().filter((p) => p.position !== 'GK')];

  let sawCornerGoal = false;
  for (let seed = 0; seed < 40; seed++) {
    const rng = createRng(seed);
    const home = {
      name: 'Home',
      lineup: draftEleven(lineupPool, FORMATIONS['4-4-2'], rng),
      posture: 'attacking',
      gamesmanship: 0,
    };
    const away = {
      name: 'Away',
      lineup: draftEleven(makePool(), FORMATIONS['4-4-2'], createRng(seed + 1000)),
      posture: 'defensive',
      gamesmanship: 0,
    };
    const result = simulateMatch({ home, away, rng });

    for (const event of result.events) {
      if (event.type !== EVENT_TYPES.GOAL_CORNER || event.assistPlayerId === undefined) continue;
      sawCornerGoal = true;
      assert.notEqual(event.assistPlayerId, keeper.id, `seed ${seed}: goalkeeper credited with taking a corner`);
    }
  }
  assert.ok(sawCornerGoal, 'expected at least one corner goal across 40 seeds to actually exercise the check');
});
