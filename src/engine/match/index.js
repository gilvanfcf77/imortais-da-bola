// Minute-by-minute match engine (see CLAUDE.md "Motor de simulação"). The
// score is a consequence of the simulated events, not the other way around.
// Every tunable number lives in ../constants.js so calibration means
// changing a value there, not touching this file.
//
// This is the only file outside match/ that anyone imports from (see
// ../index.js's `export { simulateMatch, resolvePenaltyShootout } from
// './match/index.js'`) — everything this module needs from the rest of
// match/ is itself internal, split by concern: team-strength math
// (teamState.js), cards (discipline.js), trait-driven multipliers
// (traitEffects.js), who-gets-picked selectors (playerPicking.js), goal
// styles (goalStyles.js), attacking possessions and penalties (attack.js),
// fouls and brawls (foul.js), per-player special abilities
// (specialAbility.js), catimba/banter flavor (gamesmanship.js), and the
// per-minute tick that wires all of those together (simulateMinute.js).

import { MATCH, PENALTY, GOALKEEPER, SHOOTOUT } from '../constants.js';
import { getTraitIntensity } from '../traits.js';
import { EVENT_TYPES } from '../narration/index.js';
import { clamp, createTeamState } from './teamState.js';
import { pushEvent } from './events.js';
import { pickSetPieceTaker, pickGoalkeeper } from './playerPicking.js';
import { checkMatchAbandoned } from './attack.js';
import { resolveStoppageAnnouncement } from './gamesmanship.js';
import { simulateMinute } from './simulateMinute.js';

/**
 * Simulates a full match minute by minute.
 * @param {object} params
 * @param {{name:string, lineup:object[], posture:'attacking'|'balanced'|'defensive', gamesmanship:number}} params.home
 * @param {{name:string, lineup:object[], posture:'attacking'|'balanced'|'defensive', gamesmanship:number}} params.away
 * @param {ReturnType<import('../rng.js').createRng>} params.rng
 */
export function simulateMatch({ home, away, rng }) {
  const homeTeam = createTeamState(home, 'home');
  const awayTeam = createTeamState(away, 'away');
  const score = { home: 0, away: 0 };
  const stats = {
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    nutmegTaunts: 0,
    brawls: 0,
    scandalousFouls: 0,
    disallowedGoals: 0,
    severeInjuries: 0,
    noCardDespiteInjury: 0,
    trashTalks: 0,
    fightCallouts: 0,
    whiffs: 0,
    goalStyles: {
      plain: 0,
      individual: 0,
      assisted: 0,
      corner: 0,
      longShot: 0,
      defensiveBlunder: 0,
      goalkeeperBlunder: 0,
      penalty: 0,
    },
    penaltiesAwarded: 0,
    penaltiesNotGiven: 0,
    penaltiesPhantom: 0,
    penaltiesWrongLocation: 0,
    penaltyMindGames: 0,
    penaltiesMissed: 0,
    goalkeeperForward: 0,
    crowdSilenced: 0,
    showboating: 0,
    refereeDeflectionGoals: 0,
    handballGoals: 0,
    specialAbilities: 0,
    stoppageTimeBooed: 0,
    throwInDelays: 0,
    goalKickDelays: 0,
    goalCelebrationStalls: 0,
    officialsAssaulted: 0,
    handballsOnTheLine: 0,
    matchAbandoned: false,
    standInGoalkeepers: 0,
  };
  const events = [];

  pushEvent(events, 0, EVENT_TYPES.KICKOFF, null, { team: home, opponent: away }, rng);

  const firstHalfStoppage = rng.int(MATCH.STOPPAGE_FIRST_HALF[0], MATCH.STOPPAGE_FIRST_HALF[1]);
  const secondHalfStoppage = rng.int(MATCH.STOPPAGE_SECOND_HALF[0], MATCH.STOPPAGE_SECOND_HALF[1]);
  const firstHalfEnd = MATCH.HALF_MINUTES + firstHalfStoppage;
  const secondHalfAnnounceMinute = firstHalfEnd + MATCH.HALF_MINUTES;
  const totalMinutes = MATCH.HALF_MINUTES * 2 + firstHalfStoppage + secondHalfStoppage;

  let finalMinute = totalMinutes;
  let abandonedSide = null;

  for (let minute = 1; minute <= totalMinutes; minute++) {
    const isSecondHalf = minute > firstHalfEnd;
    events.push(...simulateMinute(minute, homeTeam, awayTeam, score, rng, stats, isSecondHalf));

    const abandonment = checkMatchAbandoned(homeTeam, awayTeam, minute, score, rng, stats);
    if (abandonment) {
      events.push(...abandonment.events);
      finalMinute = minute;
      abandonedSide = abandonment.offendingSide;
      break;
    }

    if (minute === MATCH.HALF_MINUTES) {
      events.push(
        ...resolveStoppageAnnouncement(
          homeTeam,
          awayTeam,
          minute,
          firstHalfStoppage,
          MATCH.STOPPAGE_FIRST_HALF,
          score,
          rng,
          stats,
        ),
      );
    }

    if (minute === secondHalfAnnounceMinute) {
      events.push(
        ...resolveStoppageAnnouncement(
          homeTeam,
          awayTeam,
          minute,
          secondHalfStoppage,
          MATCH.STOPPAGE_SECOND_HALF,
          score,
          rng,
          stats,
        ),
      );
    }

    if (minute === firstHalfEnd) {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.HALFTIME,
        null,
        { team: home, opponent: away, homeGoals: score.home, awayGoals: score.away },
        rng,
      );
    }
  }

  pushEvent(
    events,
    finalMinute,
    EVENT_TYPES.FULLTIME,
    null,
    { team: home, opponent: away, homeGoals: score.home, awayGoals: score.away },
    rng,
  );

  return {
    homeGoals: score.home,
    awayGoals: score.away,
    abandoned: abandonedSide !== null,
    abandonedSide,
    events,
    // Exposed so a caller can resolve a penalty shootout on a draw with the
    // correct eligibility: a player sent off during regulation can't take a
    // kick, and an injured one should carry the same overall penalty they
    // played the rest of the match with. Same reasoning for the stand-in
    // goalkeeper (see discipline.js's maybeAssignStandInGoalkeeper) — if
    // regulation ended with an outfield player in goal, the shootout should
    // keep facing that same player, not roll a fresh random one for every
    // kick.
    homeSentOffIds: [...homeTeam.redCards],
    awaySentOffIds: [...awayTeam.redCards],
    homeInjuries: Object.fromEntries(homeTeam.injuries),
    awayInjuries: Object.fromEntries(awayTeam.injuries),
    homeStandInGoalkeeperId: homeTeam.standInGoalkeeperId,
    awayStandInGoalkeeperId: awayTeam.standInGoalkeeperId,
    stats: {
      fouls: stats.fouls.home + stats.fouls.away,
      foulsBySide: stats.fouls,
      yellowCards: stats.yellowCards.home + stats.yellowCards.away,
      yellowCardsBySide: stats.yellowCards,
      redCards: stats.redCards.home + stats.redCards.away,
      redCardsBySide: stats.redCards,
      nutmegTaunts: stats.nutmegTaunts,
      brawls: stats.brawls,
      scandalousFouls: stats.scandalousFouls,
      disallowedGoals: stats.disallowedGoals,
      severeInjuries: stats.severeInjuries,
      noCardDespiteInjury: stats.noCardDespiteInjury,
      trashTalks: stats.trashTalks,
      fightCallouts: stats.fightCallouts,
      whiffs: stats.whiffs,
      goalStyles: stats.goalStyles,
      penaltiesAwarded: stats.penaltiesAwarded,
      penaltiesNotGiven: stats.penaltiesNotGiven,
      penaltiesPhantom: stats.penaltiesPhantom,
      penaltiesWrongLocation: stats.penaltiesWrongLocation,
      penaltyMindGames: stats.penaltyMindGames,
      penaltiesMissed: stats.penaltiesMissed,
      goalkeeperForward: stats.goalkeeperForward,
      crowdSilenced: stats.crowdSilenced,
      showboating: stats.showboating,
      refereeDeflectionGoals: stats.refereeDeflectionGoals,
      handballGoals: stats.handballGoals,
      specialAbilities: stats.specialAbilities,
      stoppageTimeBooed: stats.stoppageTimeBooed,
      throwInDelays: stats.throwInDelays,
      goalKickDelays: stats.goalKickDelays,
      goalCelebrationStalls: stats.goalCelebrationStalls,
      officialsAssaulted: stats.officialsAssaulted,
      handballsOnTheLine: stats.handballsOnTheLine,
      matchAbandoned: stats.matchAbandoned,
      standInGoalkeepers: stats.standInGoalkeepers,
    },
  };
}

// Resolves a penalty shootout, for when a knockout match needs a winner and
// simulateMatch ended level. `home`/`away` should already reflect
// regulation's outcome — sent-off players filtered out and injury overall
// penalties applied by the caller (see homeSentOffIds/awaySentOffIds/
// homeInjuries/awayInjuries on simulateMatch's return value) — this function
// itself has no idea a regulation match even happened. `startMinute` just
// keeps the shootout's events numbered right after the match's own, so a
// combined event log stays chronological. `homeStandInGoalkeeperId`/
// `awayStandInGoalkeeperId` (also from simulateMatch's return value, if
// regulation ended with an outfield player in goal) keep the shootout
// facing that same player on every kick, instead of pickGoalkeeper falling
// back to a fresh random pick each time (there's no real GK left in the
// lineup for it to find).
//
// Reuses resolvePenalty's own miss-chance formula and mind-games flavor for
// every kick; the only genuinely new mechanic here is the alternating-kicks-
// then-sudden-death structure. Always resolves to a winner — there's no draw
// outcome, sudden death continues until the tie breaks.
export function resolvePenaltyShootout({
  home,
  away,
  rng,
  startMinute,
  homeStandInGoalkeeperId = null,
  awayStandInGoalkeeperId = null,
}) {
  const homeTeam = createTeamState(home, 'home');
  const awayTeam = createTeamState(away, 'away');
  homeTeam.standInGoalkeeperId = homeStandInGoalkeeperId;
  awayTeam.standInGoalkeeperId = awayStandInGoalkeeperId;
  const events = [];
  const score = { home: 0, away: 0 };
  const taken = { home: new Set(), away: new Set() };
  let minute = startMinute;

  pushEvent(events, minute, EVENT_TYPES.SHOOTOUT_START, null, {}, rng);

  function takeKick(side) {
    const kickingTeam = side === 'home' ? homeTeam : awayTeam;
    const defendingTeam = side === 'home' ? awayTeam : homeTeam;
    const kicker = pickSetPieceTaker(kickingTeam, rng, taken[side]);
    taken[side].add(kicker.id);
    const keeper = pickGoalkeeper(defendingTeam, rng);
    minute += 1;

    let mindGamesMultiplier = 1;
    if (rng.chance(PENALTY.GOALKEEPER_MIND_GAMES_CHANCE)) {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.PENALTY_MIND_GAMES,
        defendingTeam.side,
        { player: kicker.name, keeper: keeper.name },
        rng,
      );
      mindGamesMultiplier = PENALTY.MIND_GAMES_MISS_WEIGHT;
    }

    const wallIntensity = getTraitIntensity(keeper, 'wall');
    const sharpshooterIntensity = getTraitIntensity(kicker, 'sharpshooter');
    // An outfield player standing in for a sent-off goalkeeper (see
    // discipline.js's maybeAssignStandInGoalkeeper) has no idea how to read
    // a penalty — easier for the kicker to convert than against a real
    // keeper.
    const standInMultiplier = defendingTeam.standInGoalkeeperId
      ? GOALKEEPER.STAND_IN_PENALTY_MISS_MULTIPLIER
      : 1;
    const missChance = clamp(
      PENALTY.BASE_MISS_CHANCE *
        (1 + wallIntensity * PENALTY.WALL_MISS_WEIGHT) *
        (1 - sharpshooterIntensity * PENALTY.SHARPSHOOTER_MISS_REDUCTION) *
        mindGamesMultiplier *
        standInMultiplier,
      PENALTY.MISS_CHANCE_FLOOR,
      PENALTY.MISS_CHANCE_CEIL,
    );

    const context = { player: kicker.name, keeper: keeper.name, team: kickingTeam.config };
    if (rng.chance(missChance)) {
      pushEvent(events, minute, EVENT_TYPES.SHOOTOUT_KICK_MISSED, kickingTeam.side, context, rng);
    } else {
      score[side]++;
      pushEvent(events, minute, EVENT_TYPES.SHOOTOUT_KICK_SCORED, kickingTeam.side, context, rng);
    }
  }

  const kicksTaken = { home: 0, away: 0 };
  for (let kickNum = 0; kickNum < SHOOTOUT.INITIAL_ROUNDS * 2; kickNum++) {
    const side = kickNum % 2 === 0 ? 'home' : 'away';
    takeKick(side);
    kicksTaken[side]++;

    const homeRemaining = SHOOTOUT.INITIAL_ROUNDS - kicksTaken.home;
    const awayRemaining = SHOOTOUT.INITIAL_ROUNDS - kicksTaken.away;
    if (score.home > score.away + awayRemaining || score.away > score.home + homeRemaining) break;
  }

  // Sudden death: one kick each per round, until the tie breaks.
  while (score.home === score.away) {
    takeKick('home');
    takeKick('away');
  }

  const winnerSide = score.home > score.away ? 'home' : 'away';
  const winnerTeam = winnerSide === 'home' ? homeTeam : awayTeam;
  pushEvent(
    events,
    minute,
    EVENT_TYPES.SHOOTOUT_WINNER,
    winnerSide,
    { team: winnerTeam.config },
    rng,
  );

  return { winnerSide, homeScore: score.home, awayScore: score.away, events };
}
