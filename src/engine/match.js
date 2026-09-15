// Minute-by-minute match engine (see CLAUDE.md "Motor de simulação"). The
// score is a consequence of the simulated events, not the other way around.
// Every tunable number lives in constants.js so calibration means changing a
// value there, not touching this file.

import {
  MATCH,
  POSTURE_MODIFIERS,
  ATTACK,
  FOUL,
  CARDS,
  GAMESMANSHIP,
  TRAIT_WEIGHTS,
  INDIVIDUAL_MULTIPLIER_CAP,
  COMBINED_MULTIPLIER_CAP,
  LEADER,
  COMEDY,
  INJURY,
  GOAL_STYLE,
  PENALTY,
  DESPERATION,
  WALL_SAVE,
  SHOOTOUT,
  GOALKEEPER,
  REFEREE,
} from './constants.js';
import { getTraitIntensity, sumTraitIntensity, combineMultipliers } from './traits.js';
import { EVENT_TYPES, narrate, narrateCustom } from './narration.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createTeamState(config, side) {
  return {
    config, // { name, lineup, posture, gamesmanship }
    side, // 'home' | 'away'
    redCards: new Set(),
    yellowCards: new Set(),
    injuries: new Map(), // playerId -> overall penalty, for the rest of the match
    // Set once the team has no goalkeeper-position player left on the pitch
    // — see maybeAssignStandInGoalkeeper below.
    standInGoalkeeperId: null,
  };
}

function activePlayers(team) {
  return team.config.lineup
    .filter((p) => !team.redCards.has(p.id))
    .map((p) => {
      const penalty = team.injuries.get(p.id);
      return penalty ? { ...p, overall: Math.max(1, p.overall - penalty) } : p;
    });
}

function sectorStrength(players, positions) {
  const group = players.filter((p) => positions.includes(p.position));
  if (group.length === 0) return 60; // neutral fallback if a sector is empty
  return group.reduce((sum, p) => sum + p.overall, 0) / group.length;
}

function teamPower(team) {
  const active = activePlayers(team);
  const numericFactor = active.length / team.config.lineup.length;
  // A team down a player still creates chances at close to its usual rate,
  // but should suffer more on the defensive end — an extra cut on top of the
  // proportional one above, defense only.
  const defenseFactor =
    active.length < team.config.lineup.length ? numericFactor * CARDS.SHORT_HANDED_DEFENSE_PENALTY : numericFactor;
  // On top of the short-handed cut above — an outfield player standing in
  // for a sent-off goalkeeper (see maybeAssignStandInGoalkeeper) is that
  // much more exposed on his own, independent of just being a man down.
  const standInGoalkeeperFactor = team.standInGoalkeeperId ? GOALKEEPER.STAND_IN_DEFENSE_PENALTY : 1;
  const mods = POSTURE_MODIFIERS[team.config.posture];
  return {
    attack: sectorStrength(active, ['FW', 'MF']) * mods.attack * numericFactor,
    defense: sectorStrength(active, ['CB', 'FB', 'GK']) * mods.defense * defenseFactor * standInGoalkeeperFactor,
  };
}

function scoreSituation(side, score) {
  const own = side === 'home' ? score.home : score.away;
  const opponent = side === 'home' ? score.away : score.home;
  if (own > opponent) return 'winning';
  if (own < opponent) return 'losing';
  return 'drawing';
}

function goalMargin(side, score) {
  const own = side === 'home' ? score.home : score.away;
  const opponent = side === 'home' ? score.away : score.home;
  return own - opponent;
}

// `meta` carries structured references (player ids, card color...) a caller
// like the viewer needs to act on — e.g. highlighting a specific player in a
// lineup panel — without having to parse them back out of `description`.
function pushEvent(events, minute, type, side, context, rng, meta) {
  events.push({ minute, type, side, description: narrate(type, context, rng), ...meta });
}

// For events whose text isn't in the shared TEMPLATES pool (currently just
// PLAYER_SPECIAL, narrated from that player's own templates).
function pushCustomEvent(events, minute, type, side, templates, context, rng, meta) {
  events.push({ minute, type, side, description: narrateCustom(templates, context, rng), ...meta });
}

// If this dismissal leaves the team with no goalkeeper-position player on
// the pitch, an outfield player is immediately drawn to fill in — a real
// keeper being sent off doesn't leave the team playing with 10, it leaves
// them playing with a keeper who's never trained for the job. Re-triggers
// if that stand-in later gets sent off too, drawing a new one each time.
function maybeAssignStandInGoalkeeper(team, minute, rng, stats) {
  const active = activePlayers(team);
  if (active.length === 0) return [];
  if (active.some((p) => p.position === 'GK')) return [];
  if (team.standInGoalkeeperId && active.some((p) => p.id === team.standInGoalkeeperId)) return [];

  const chosen = rng.pick(active);
  team.standInGoalkeeperId = chosen.id;
  stats.standInGoalkeepers++;
  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.OUTFIELD_PLAYER_IN_GOAL,
    team.side,
    { player: chosen.name, team: team.config.name },
    rng,
    { playerId: chosen.id }
  );
  return events;
}

function sendOff(team, player, minute, rng, stats) {
  team.redCards.add(player.id);
  stats.redCards[team.side]++;
  return maybeAssignStandInGoalkeeper(team, minute, rng, stats);
}

// Shared by resolveFoul and any other situation (throw-in/goal-kick delay)
// that can end in a yellow — handles the "already has one" upgrade to a
// second-yellow red the same way everywhere.
function issueYellowCard(team, player, minute, rng, stats) {
  const events = [];
  if (team.yellowCards.has(player.id)) {
    pushEvent(events, minute, EVENT_TYPES.SECOND_YELLOW_RED, team.side, { player: player.name }, rng, {
      playerId: player.id,
      cardType: 'red',
    });
    events.push(...sendOff(team, player, minute, rng, stats));
  } else {
    team.yellowCards.add(player.id);
    stats.yellowCards[team.side]++;
    pushEvent(events, minute, EVENT_TYPES.YELLOW_CARD, team.side, { player: player.name }, rng, {
      playerId: player.id,
      cardType: 'yellow',
    });
  }
  return events;
}

// The referee, not the player, becomes reluctant to show a second yellow
// (which sends the player off) — so fouls that would otherwise draw a card
// get let go more often once a player is already booked. This is deliberately
// NOT the player playing more carefully; it's refereeing leniency.
function refereeLeniencyWeight(team, player) {
  return team.yellowCards.has(player.id) ? CARDS.LENIENCY_ON_BOOKED_PLAYER : 1;
}

// `benefitedSide` is whichever team comes out ahead if this particular
// discretionary call goes through (awarded a penalty, shown a card to the
// other side, had a goal disallowed against them) — see REFEREE.HOME_BIAS
// in constants.js. Multiplies that call's chance up when the benefited
// side is home, down when it's away, so a single constant swings both
// directions symmetrically.
function refereeBiasMultiplier(benefitedSide) {
  return benefitedSide === 'home' ? REFEREE.HOME_BIAS : 1 / REFEREE.HOME_BIAS;
}

// --- Trait-driven multipliers -----------------------------------------

function averageOverall(players) {
  if (players.length === 0) return 60; // neutral fallback, mirrors sectorStrength's
  return players.reduce((sum, p) => sum + p.overall, 0) / players.length;
}

// A big-underdog-nursing-a-shock-lead situation — see
// GAMESMANSHIP.UNDERDOG_* in constants.js.
function isUnderdog(team, opponent) {
  return averageOverall(activePlayers(opponent)) - averageOverall(activePlayers(team)) >= GAMESMANSHIP.UNDERDOG_OVERALL_GAP;
}

// Gamesmanship only makes sense as a way to run down the clock on a result
// worth protecting, so its mechanical effects (extra fouls, card risk,
// rhythm-breaking, time-wasting flavor events) only apply while the team is
// winning OR drawing — a draw is very much a result worth stalling for
// (holding a 0-0, running out the clock on level terms), not just an
// outright lead. A losing team still has nothing to stall for. This only
// looks at the current match's score; once the cup's two-legged ties exist
// (see CLAUDE.md "Passo 3"), it should also treat being ahead on aggregate
// from the first leg as "winning" here.
//
// On top of that deliberately-configured level: a big underdog holding an
// actual lead late in the match gets a floor bumped up to
// UNDERDOG_INSTINCTIVE_LEVEL regardless of what catimba was set before
// kickoff — see isUnderdog above. This is the PLAYERS' own instinct under
// pressure, not a manager's tactical dial, which is why it's additive
// (never lowers a deliberately higher setting) rather than something the
// user configures.
function effectiveGamesmanship(team, opponent, minute, score) {
  const situation = scoreSituation(team.side, score);
  if (situation === 'losing') return 0;
  const configured = team.config.gamesmanship ?? 0;
  if (situation === 'winning' && minute >= GAMESMANSHIP.UNDERDOG_LATE_GAME_MINUTE && isUnderdog(team, opponent)) {
    return Math.max(configured, GAMESMANSHIP.UNDERDOG_INSTINCTIVE_LEVEL);
  }
  return configured;
}

function rhythmBreakReduction(team, opponent, minute, score) {
  const level = effectiveGamesmanship(team, opponent, minute, score);
  if (level === 0) return 0;
  const cynicalIntensity = sumTraitIntensity(activePlayers(team), 'cynicalFouler');
  if (cynicalIntensity === 0) return 0; // gamesmanship without a cynicalFouler buys nothing
  const reduction = level * cynicalIntensity * GAMESMANSHIP.RHYTHM_BREAK_PER_CYNICAL_INTENSITY;
  return Math.min(GAMESMANSHIP.RHYTHM_BREAK_CAP, reduction);
}

function wallReductionMultiplier(defendingTeam) {
  const intensity = sumTraitIntensity(activePlayers(defendingTeam), 'wall');
  if (intensity === 0) return 1;
  const reduction = Math.min(
    TRAIT_WEIGHTS.WALL_REDUCTION_CAP,
    intensity * TRAIT_WEIGHTS.WALL_REDUCTION_PER_INTENSITY
  );
  return 1 - reduction;
}

function leaderHoldMultiplier(defendingTeam, minute, score) {
  if (minute < LEADER.LATE_GAME_MINUTE) return 1;
  if (scoreSituation(defendingTeam.side, score) === 'losing') return 1;
  const intensity = sumTraitIntensity(activePlayers(defendingTeam), 'leader');
  if (intensity === 0) return 1;
  return Math.max(LEADER.HOLD_RESULT_FLOOR, 1 - intensity * LEADER.HOLD_RESULT_WEIGHT);
}

function leaderComebackMultiplier(attackingTeam, score) {
  if (scoreSituation(attackingTeam.side, score) !== 'losing') return 1;
  const intensity = sumTraitIntensity(activePlayers(attackingTeam), 'leader');
  if (intensity === 0) return 1;
  return Math.min(LEADER.COMEBACK_CAP, 1 + intensity * LEADER.COMEBACK_WEIGHT);
}

// --- Picking who's involved ---------------------------------------------

// `exclude` (optional) is a Set of player ids to skip — used by the penalty
// shootout to avoid the same kicker going twice before everyone else has had
// a turn. Falls back to the full active roster once everyone in it is
// excluded (nobody left to pick from otherwise).
function pickFinisher(team, rng, exclude) {
  const active = activePlayers(team).filter((p) => !exclude?.has(p.id));
  const pool = active.length > 0 ? active : activePlayers(team);
  const candidates = pool.filter((p) => ATTACK.FINISHER_WEIGHT[p.position]);
  if (candidates.length === 0) return rng.pick(pool);
  const weights = candidates.map(
    (p) =>
      ATTACK.FINISHER_WEIGHT[p.position] +
      getTraitIntensity(p, 'sharpshooter') * TRAIT_WEIGHTS.SHARPSHOOTER_FINISH_WEIGHT
  );
  return rng.pickWeighted(candidates, weights);
}

function pickSetPieceTaker(team, rng, exclude) {
  const active = activePlayers(team).filter((p) => !exclude?.has(p.id));
  const pool = active.length > 0 ? active : activePlayers(team);
  return rng.pickWeighted(
    pool,
    pool.map(
      (p) =>
        1 +
        getTraitIntensity(p, 'sharpshooter') * TRAIT_WEIGHTS.SHARPSHOOTER_FINISH_WEIGHT +
        getTraitIntensity(p, 'freeKickSpecialist') * TRAIT_WEIGHTS.SET_PIECE_SPECIALIST_WEIGHT
    )
  );
}

function pickOffender(team, rng) {
  const candidates = activePlayers(team);
  const weights = candidates.map((p) => {
    const base = p.position === 'GK' ? CARDS.GOALKEEPER_OFFENDER_WEIGHT : 1;
    return base + getTraitIntensity(p, 'shortFuse') * CARDS.SHORT_FUSE_OFFENDER_WEIGHT;
  });
  return rng.pickWeighted(candidates, weights);
}

function pickTauntVictim(team, rng) {
  const active = activePlayers(team);
  const defenders = active.filter((p) => p.position === 'CB' || p.position === 'FB');
  return rng.pick(defenders.length > 0 ? defenders : active);
}

function pickGoalkeeper(team, rng) {
  const active = activePlayers(team);
  // Once a specific outfield player has taken over in goal (see
  // maybeAssignStandInGoalkeeper), every later "the goalkeeper does X"
  // moment should keep naming that same player, not a fresh random pick
  // each time — same person, whole rest of the match, same as a real
  // improvised keeper.
  if (team.standInGoalkeeperId) {
    const standIn = active.find((p) => p.id === team.standInGoalkeeperId);
    if (standIn) return standIn;
  }
  const keepers = active.filter((p) => p.position === 'GK');
  return rng.pick(keepers.length > 0 ? keepers : active);
}

const GOAL_STYLE_EVENT_TYPE = {
  plain: EVENT_TYPES.GOAL,
  individual: EVENT_TYPES.GOAL_INDIVIDUAL,
  assisted: EVENT_TYPES.GOAL_ASSISTED,
  corner: EVENT_TYPES.GOAL_CORNER,
  longShot: EVENT_TYPES.GOAL_LONG_SHOT,
  defensiveBlunder: EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER,
  goalkeeperBlunder: EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER,
};

// `opponentHasStandInGoalkeeper`: the attacking side deliberately shoots
// from distance more often against an outfield player standing in as
// goalkeeper (see maybeAssignStandInGoalkeeper) — a tactical choice by the
// attackers, not some automatic side effect of the defense being weaker.
function pickGoalStyle(rng, finisher, opponentHasStandInGoalkeeper) {
  const dribblerIntensity = getTraitIntensity(finisher, 'dribbler');
  const styles = Object.keys(GOAL_STYLE.WEIGHTS);
  const weights = styles.map((style) => {
    const base = GOAL_STYLE.WEIGHTS[style];
    if (style === 'individual') return base * (1 + dribblerIntensity * TRAIT_WEIGHTS.DRIBBLER_INDIVIDUAL_GOAL_WEIGHT);
    if (style === 'longShot' && opponentHasStandInGoalkeeper) return base * GOALKEEPER.OPPONENT_LONG_SHOT_WEIGHT;
    return base;
  });
  return rng.pickWeighted(styles, weights);
}

// IFAB Law 3: a match can't continue once a side drops below 7 players.
// Checked once per minute, after that minute's own events have already
// fired, so a card issued mid-minute still gets its own event before the
// match is cut short. What happens to the result after an abandonment isn't
// an IFAB rule — it's a competition-regulation call, but the common
// Brazilian convention (and the one this follows) is: WO for the offending
// side at a fixed MATCH.WO_SCORE, UNLESS the winning side was already ahead
// by that much or more on the field, in which case the real score on the
// board stands instead (no reason to shrink a 5-1 lead down to a 3-0 WO).
// The final score is carried on the MATCH_ABANDONED event itself
// (homeGoals/awayGoals in `meta`) so a caller replaying events one at a
// time for a live scoreboard (MatchScreen.jsx, viewer.html) can snap to it
// instead of trying to track it incrementally.
function checkMatchAbandoned(homeTeam, awayTeam, minute, score, rng, stats) {
  const homeCount = activePlayers(homeTeam).length;
  const awayCount = activePlayers(awayTeam).length;
  if (homeCount >= MATCH.MIN_PLAYERS_TO_CONTINUE && awayCount >= MATCH.MIN_PLAYERS_TO_CONTINUE) return null;

  // Both sides collapsing in the same minute (e.g. a mass brawl sending off
  // players on both teams at once) is a rare edge case — whichever has
  // fewer players is treated as the offending side, ties defaulting to home.
  const offendingSide = homeCount <= awayCount ? 'home' : 'away';
  const offendingTeam = offendingSide === 'home' ? homeTeam : awayTeam;
  const winningSide = offendingSide === 'home' ? 'away' : 'home';
  const winningTeam = offendingSide === 'home' ? awayTeam : homeTeam;

  if (score[winningSide] - score[offendingSide] < MATCH.WO_SCORE) {
    score[winningSide] = MATCH.WO_SCORE;
    score[offendingSide] = 0;
  }

  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.MATCH_ABANDONED,
    offendingSide,
    { team: offendingTeam.config.name, opponent: winningTeam.config.name },
    rng,
    { homeGoals: score.home, awayGoals: score.away }
  );
  stats.matchAbandoned = true;
  return { events, offendingSide };
}

// Away-team-only: taunting the home crowd only makes sense for the visiting
// side breaking a hostile stadium's heart, not a home player taunting their
// own fans. Only fires on the specific goal that flips the match into the
// away team's favor, not on every goal scored while already ahead.
function maybeSilenceCrowd(scoringTeam, tookTheLead, scorer, minute, rng, stats) {
  if (scoringTeam.side !== 'away' || !tookTheLead || !rng.chance(COMEDY.CROWD_SILENCED_CHANCE)) return [];
  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.CROWD_SILENCED,
    scoringTeam.side,
    { player: scorer.name, team: scoringTeam.config.name },
    rng,
    { playerId: scorer.id }
  );
  stats.crowdSilenced++;
  return events;
}

// --- Event resolution -----------------------------------------------------

// `situation` is 'normal' (a real, clear penalty situation — might still be
// waved off, see NOT_GIVEN_CHANCE below), 'phantom' (no foul happened at
// all — a dive, the ball hitting the shooter's chest misread as a handball),
// or 'wrongLocation' (a real foul happened, but outside the area — the
// referee still points to the spot). Both error cases skip NOT_GIVEN_CHANCE:
// the referee has already made up their mind wrongly, there's no second roll
// for whether they also wave it off.
function resolvePenalty(attackingTeam, defendingTeam, finisher, minute, score, rng, stats, situation) {
  const events = [];
  finisher = pickSetPieceTaker(attackingTeam, rng);

  if (situation === 'phantom') {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_PHANTOM,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config.name },
      rng
    );
    stats.penaltiesPhantom++;
  } else if (situation === 'wrongLocation') {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_WRONG_LOCATION,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config.name },
      rng
    );
    stats.penaltiesWrongLocation++;
    // Not giving a deserved penalty benefits whoever was defending it.
  } else if (rng.chance(PENALTY.NOT_GIVEN_CHANCE * refereeBiasMultiplier(defendingTeam.side))) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_NOT_GIVEN,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config.name },
      rng
    );
    stats.penaltiesNotGiven++;
    return events;
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_AWARDED,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config.name },
      rng
    );
    stats.penaltiesAwarded++;
  }

  const keeper = pickGoalkeeper(defendingTeam, rng);
  let mindGamesMultiplier = 1;
  if (rng.chance(PENALTY.GOALKEEPER_MIND_GAMES_CHANCE)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_MIND_GAMES,
      defendingTeam.side,
      { player: finisher.name, keeper: keeper.name },
      rng
    );
    mindGamesMultiplier = PENALTY.MIND_GAMES_MISS_WEIGHT;
    stats.penaltyMindGames++;
  }

  const wallIntensity = getTraitIntensity(keeper, 'wall');
  const sharpshooterIntensity = getTraitIntensity(finisher, 'sharpshooter');
  // An outfield player standing in for a sent-off goalkeeper (see
  // maybeAssignStandInGoalkeeper) has no idea how to read a penalty —
  // easier for the kicker to convert than against a real keeper.
  const standInMultiplier = defendingTeam.standInGoalkeeperId ? GOALKEEPER.STAND_IN_PENALTY_MISS_MULTIPLIER : 1;
  const missChance = clamp(
    PENALTY.BASE_MISS_CHANCE *
      (1 + wallIntensity * PENALTY.WALL_MISS_WEIGHT) *
      (1 - sharpshooterIntensity * PENALTY.SHARPSHOOTER_MISS_REDUCTION) *
      mindGamesMultiplier *
      standInMultiplier,
    PENALTY.MISS_CHANCE_FLOOR,
    PENALTY.MISS_CHANCE_CEIL
  );

  if (rng.chance(missChance)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_MISSED,
      attackingTeam.side,
      { player: finisher.name, keeper: keeper.name, team: attackingTeam.config.name },
      rng
    );
    stats.penaltiesMissed++;
    return events;
  }

  const wasWinningBefore = scoreSituation(attackingTeam.side, score) === 'winning';
  if (attackingTeam.side === 'home') score.home++;
  else score.away++;
  const tookTheLead = !wasWinningBefore && scoreSituation(attackingTeam.side, score) === 'winning';

  pushEvent(
    events,
    minute,
    EVENT_TYPES.GOAL_PENALTY,
    attackingTeam.side,
    { player: finisher.name, team: attackingTeam.config.name },
    rng,
    { playerId: finisher.id }
  );
  stats.goalStyles.penalty++;
  events.push(...maybeSilenceCrowd(attackingTeam, tookTheLead, finisher, minute, rng, stats));
  return events;
}

function resolveAttack(attackingTeam, defendingTeam, minute, score, rng, stats) {
  const events = [];
  const active = activePlayers(attackingTeam);
  if (active.length === 0) return events;

  const finisher = pickFinisher(attackingTeam, rng);
  // A phantom penalty benefits whoever gets awarded it — the attacking side.
  if (rng.chance(PENALTY.PHANTOM_CHANCE * refereeBiasMultiplier(attackingTeam.side))) {
    return resolvePenalty(attackingTeam, defendingTeam, finisher, minute, score, rng, stats, 'phantom');
  }
  if (rng.chance(PENALTY.SITUATION_CHANCE)) {
    return resolvePenalty(attackingTeam, defendingTeam, finisher, minute, score, rng, stats, 'normal');
  }

  const playmakerIntensity = sumTraitIntensity(active, 'playmaker');
  const clearChanceRate = clamp(
    ATTACK.BASE_CLEAR_CHANCE_RATE * (1 + playmakerIntensity * TRAIT_WEIGHTS.PLAYMAKER_CLEAR_CHANCE_WEIGHT),
    0,
    0.9
  );
  const isClearChance = rng.chance(clearChanceRate);
  const baseConversion = isClearChance ? ATTACK.CONVERSION_CLEAR_CHANCE : ATTACK.CONVERSION_NORMAL_CHANCE;

  const finisherMultiplier = combineMultipliers(
    [1 + getTraitIntensity(finisher, 'sharpshooter') * TRAIT_WEIGHTS.SHARPSHOOTER_FINISH_WEIGHT],
    INDIVIDUAL_MULTIPLIER_CAP
  );
  const comebackMultiplier = leaderComebackMultiplier(attackingTeam, score);
  const attackMultiplier = combineMultipliers([finisherMultiplier, comebackMultiplier], COMBINED_MULTIPLIER_CAP);

  const wallMultiplier = wallReductionMultiplier(defendingTeam);
  const holdMultiplier = leaderHoldMultiplier(defendingTeam, minute, score);
  const defenseMultiplier = wallMultiplier * holdMultiplier;
  // Not a defense number — this is the attacking side choosing to press an
  // outfield player standing in as goalkeeper (see
  // maybeAssignStandInGoalkeeper), so it's kept as its own factor rather
  // than folded into defenseMultiplier above.
  const standInGoalkeeperMultiplier = defendingTeam.standInGoalkeeperId ? GOALKEEPER.OPPONENT_ATTACK_BOOST : 1;

  const finalChance = clamp(
    baseConversion * attackMultiplier * defenseMultiplier * standInGoalkeeperMultiplier,
    0,
    0.95
  );

  if (rng.chance(finalChance)) {
    const wasWinningBefore = scoreSituation(attackingTeam.side, score) === 'winning';
    if (attackingTeam.side === 'home') score.home++;
    else score.away++;
    const isFirstGoalForTeam = score[attackingTeam.side] === 1;
    const tookTheLead = !wasWinningBefore && scoreSituation(attackingTeam.side, score) === 'winning';

    const style = pickGoalStyle(rng, finisher, Boolean(defendingTeam.standInGoalkeeperId));
    const context = { player: finisher.name, team: attackingTeam.config.name };
    let goalEventType = GOAL_STYLE_EVENT_TYPE[style];
    let assistPlayerId = null;

    if (style === 'assisted') {
      // The goalkeeper stays eligible here — unlike 'corner' below, a keeper
      // genuinely can set up a goal with a long clearance or a throw, it's
      // just rare — but gets a flat, un-scaled GOALKEEPER_ASSIST_WEIGHT
      // instead of the usual playmaker-scaled formula, so it stays a rare
      // highlight rather than a routine outcome.
      const teammates = activePlayers(attackingTeam).filter((p) => p.id !== finisher.id);
      if (teammates.length === 0) {
        goalEventType = EVENT_TYPES.GOAL;
      } else {
        const assistProvider = rng.pickWeighted(
          teammates,
          teammates.map((p) =>
            p.position === 'GK'
              ? TRAIT_WEIGHTS.GOALKEEPER_ASSIST_WEIGHT
              : 1 + getTraitIntensity(p, 'playmaker') * TRAIT_WEIGHTS.PLAYMAKER_ASSIST_WEIGHT
          )
        );
        context.assist = assistProvider.name;
        assistPlayerId = assistProvider.id;
      }
    } else if (style === 'corner') {
      // Excludes the goalkeeper: corners are taken from the opponent's byline,
      // nowhere near their own box, so the keeper is never a candidate —
      // freeKickSpecialist means "trusted with frontal free kicks and
      // penalties" (see pickSetPieceTaker), not "also takes corners". Without
      // this, a keeper with that trait (e.g. Rogério Ceni) could get credited
      // with taking every corner that led to a goal, which never happens in
      // real football.
      //
      // Same fallback as before: with nobody left to have taken the corner
      // (last man standing after red cards), there's no assist to credit —
      // narrate it as a plain goal instead.
      const teammates = activePlayers(attackingTeam).filter((p) => p.id !== finisher.id && p.position !== 'GK');
      if (teammates.length === 0) {
        goalEventType = EVENT_TYPES.GOAL;
      } else {
        const kicker = rng.pickWeighted(
          teammates,
          teammates.map(
            (p) =>
              1 +
              getTraitIntensity(p, 'playmaker') * TRAIT_WEIGHTS.PLAYMAKER_ASSIST_WEIGHT +
              getTraitIntensity(p, 'freeKickSpecialist') * TRAIT_WEIGHTS.SET_PIECE_SPECIALIST_WEIGHT
          )
        );
        context.assist = kicker.name;
        assistPlayerId = kicker.id;
      }
    } else if (style === 'defensiveBlunder') {
      context.victim = pickTauntVictim(defendingTeam, rng).name;
    } else if (style === 'goalkeeperBlunder') {
      context.keeper = pickGoalkeeper(defendingTeam, rng).name;
    } else if (style === 'longShot') {
      // Set unconditionally so both the plain long-shot templates and the
      // deflection ones (which reference {victim}) can share the same pool.
      context.victim = pickTauntVictim(defendingTeam, rng).name;
      if (rng.chance(GOAL_STYLE.LONG_SHOT_REFEREE_DEFLECTION_CHANCE)) {
        goalEventType = EVENT_TYPES.GOAL_REFEREE_DEFLECTION;
        stats.refereeDeflectionGoals++;
      }
    }

    if (
      style === 'corner' &&
      minute >= DESPERATION.LATE_GAME_MINUTE &&
      scoreSituation(attackingTeam.side, score) === 'losing'
    ) {
      const keeper = pickGoalkeeper(attackingTeam, rng);
      pushEvent(
        events,
        minute,
        EVENT_TYPES.GOALKEEPER_FORWARD,
        attackingTeam.side,
        { keeper: keeper.name, team: attackingTeam.config.name },
        rng
      );
      stats.goalkeeperForward++;
    }

    // The plain style's "faz mais um" ("scores another") phrasing only
    // makes sense once the team already has a goal on the board.
    if (goalEventType === EVENT_TYPES.GOAL && !isFirstGoalForTeam) {
      goalEventType = EVENT_TYPES.GOAL_ANOTHER;
    }

    stats.goalStyles[style]++;
    pushEvent(events, minute, goalEventType, attackingTeam.side, context, rng, {
      playerId: finisher.id,
      ...(assistPlayerId ? { assistPlayerId } : {}),
    });
    events.push(...maybeSilenceCrowd(attackingTeam, tookTheLead, finisher, minute, rng, stats));

    // The reversal: for maximum drama this is checked only now, after the
    // goal has already been fully announced and celebrated — not as an
    // alternative to scoring in the first place. Disallowing it benefits
    // whoever was defending, i.e. the side that just conceded.
    if (rng.chance(COMEDY.DISALLOWED_GOAL_CHANCE * refereeBiasMultiplier(defendingTeam.side))) {
      if (attackingTeam.side === 'home') score.home--;
      else score.away--;
      pushEvent(
        events,
        minute,
        EVENT_TYPES.DISALLOWED_GOAL,
        attackingTeam.side,
        { player: finisher.name, team: attackingTeam.config.name },
        rng
      );
      stats.disallowedGoals++;

      const instigator = pickShortFuseInstigator(attackingTeam, rng);
      if (instigator && rng.chance(COMEDY.OFFICIAL_ASSAULT_CHANCE_AFTER_DISALLOWED_GOAL)) {
        pushEvent(
          events,
          minute,
          EVENT_TYPES.OFFICIAL_ASSAULTED,
          attackingTeam.side,
          { player: instigator.name, team: attackingTeam.config.name },
          rng,
          { playerId: instigator.id, cardType: 'red' }
        );
        events.push(...sendOff(attackingTeam, instigator, minute, rng, stats));
        stats.officialsAssaulted++;
      }
    }

    return events;
  }

  const wallDefenders = activePlayers(defendingTeam).filter((p) => getTraitIntensity(p, 'wall') > 0);
  if (wallDefenders.length > 0 && rng.chance(0.5)) {
    const defenderPlayer = rng.pick(wallDefenders);
    const saveContext = { player: finisher.name, defender: defenderPlayer.name, team: attackingTeam.config.name };

    if (defenderPlayer.position === 'GK') {
      // Goalkeepers are allowed to use their hands — this is always a clean save.
      pushEvent(events, minute, EVENT_TYPES.WALL_SAVE, attackingTeam.side, saveContext, rng);
    } else if (rng.chance(WALL_SAVE.OUTFIELD_HANDBALL_CHANCE)) {
      // An outfield player isn't allowed to use their hands — this is a
      // penalty situation, resolved exactly like any other one (award vs.
      // not given by referee error, goalkeeper mind games, miss chance).
      pushEvent(events, minute, EVENT_TYPES.HANDBALL_ON_THE_LINE, attackingTeam.side, saveContext, rng, {
        playerId: defenderPlayer.id,
      });
      stats.handballsOnTheLine++;
      events.push(...resolvePenalty(attackingTeam, defendingTeam, finisher, minute, score, rng, stats, 'normal'));
    } else {
      pushEvent(events, minute, EVENT_TYPES.GOAL_LINE_CLEARANCE, attackingTeam.side, saveContext, rng, {
        playerId: defenderPlayer.id,
      });
    }
  } else if (rng.chance(COMEDY.WHIFF_CHANCE)) {
    // The crowd reacting is always the home crowd — the dominant presence
    // in the stadium in this abstraction. Booing only makes sense directed
    // at the rival: an away finisher gets jeered by the home crowd
    // (WHIFF). A home finisher's own miss instead gets a pained,
    // hands-on-head reaction from their own fans (WHIFF_HOME_MISS) — see
    // narration.js for why that's a separate event type from WHIFF.
    if (attackingTeam.side === 'home') {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.WHIFF_HOME_MISS,
        attackingTeam.side,
        { player: finisher.name, team: attackingTeam.config.name },
        rng
      );
    } else {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.WHIFF,
        attackingTeam.side,
        { player: finisher.name, team: attackingTeam.config.name, crowd: defendingTeam.config.name },
        rng
      );
    }
    stats.whiffs++;
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.CHANCE_MISSED,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config.name },
      rng
    );
  }
  return events;
}

function resolveFoul(offendingTeam, fouledTeam, minute, score, rng, stats) {
  const events = [];
  const offender = pickOffender(offendingTeam, rng);
  stats.fouls[offendingTeam.side]++;

  // A goalkeeper rarely contests the ball far from their own goal, so almost
  // any foul they commit is inside the area — skip the normal foul/card flow
  // entirely and resolve it as a penalty, the same way HANDBALL_ON_THE_LINE
  // hands off to resolvePenalty for an outfield player's goal-line handball.
  if (offender.position === 'GK' && rng.chance(PENALTY.GOALKEEPER_FOUL_CHANCE)) {
    const finisher = pickFinisher(fouledTeam, rng);
    return resolvePenalty(fouledTeam, offendingTeam, finisher, minute, score, rng, stats, 'normal');
  }

  // Referee howler: the foul was real, but committed outside the area — the
  // referee still points to the spot. Distinct from PENALTY_PHANTOM (no foul
  // happened at all). Excludes goalkeepers — their fouls are already handled
  // above and are basically always near their own goal, so "wrong location"
  // doesn't read right for them.
  // A wrongly-awarded penalty benefits whoever gets to take it — the fouled side.
  if (
    offender.position !== 'GK' &&
    rng.chance(PENALTY.WRONG_LOCATION_CHANCE * refereeBiasMultiplier(fouledTeam.side))
  ) {
    const finisher = pickFinisher(fouledTeam, rng);
    return resolvePenalty(fouledTeam, offendingTeam, finisher, minute, score, rng, stats, 'wrongLocation');
  }

  const shortFuseIntensity = getTraitIntensity(offender, 'shortFuse');
  const isScandalous =
    shortFuseIntensity > 0 &&
    rng.chance(shortFuseIntensity * COMEDY.SCANDALOUS_FOUL_CHANCE_PER_SHORT_FUSE_INTENSITY);

  if (isScandalous) {
    const victim = pickTauntVictim(fouledTeam, rng);
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SCANDALOUS_FOUL,
      offendingTeam.side,
      { player: offender.name, victim: victim.name },
      rng
    );
    stats.scandalousFouls++;
  } else {
    pushEvent(events, minute, EVENT_TYPES.FOUL, offendingTeam.side, { player: offender.name }, rng);
  }

  const injuryChance = INJURY.SEVERE_INJURY_CHANCE * (isScandalous ? INJURY.SCANDALOUS_INJURY_WEIGHT : 1);
  if (rng.chance(injuryChance)) {
    const injuredPlayer = pickTauntVictim(fouledTeam, rng);
    fouledTeam.injuries.set(
      injuredPlayer.id,
      Math.max(fouledTeam.injuries.get(injuredPlayer.id) ?? 0, INJURY.INJURED_OVERALL_PENALTY)
    );
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SEVERE_INJURY,
      offendingTeam.side,
      { player: offender.name, victim: injuredPlayer.name },
      rng,
      { victimId: injuredPlayer.id }
    );
    stats.severeInjuries++;

    if (rng.chance(INJURY.NO_CARD_DESPITE_INJURY_CHANCE)) {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.NO_CARD_DESPITE_INJURY,
        offendingTeam.side,
        { player: offender.name, victim: injuredPlayer.name },
        rng
      );
      stats.noCardDespiteInjury++;
      return events;
    }
  }

  if (shortFuseIntensity > 0 && rng.chance(shortFuseIntensity * COMEDY.OFFICIAL_ASSAULT_CHANCE_PER_INTENSITY)) {
    pushEvent(events, minute, EVENT_TYPES.OFFICIAL_ASSAULTED, offendingTeam.side, { player: offender.name }, rng, {
      playerId: offender.id,
      cardType: 'red',
    });
    events.push(...sendOff(offendingTeam, offender, minute, rng, stats));
    stats.officialsAssaulted++;
    return events;
  }

  const gamesmanshipLevel = effectiveGamesmanship(offendingTeam, fouledTeam, minute, score);
  // Showing a card benefits the fouled side, not the offender — the home
  // crowd's pressure makes the referee more willing to card an away
  // offender, more reluctant to card a home one.
  const cardBias = refereeBiasMultiplier(fouledTeam.side);
  const straightRedChance =
    CARDS.BASE_STRAIGHT_RED_CHANCE * (1 + gamesmanshipLevel * GAMESMANSHIP.CARD_RISK_PER_LEVEL) * cardBias;
  if (rng.chance(straightRedChance)) {
    pushEvent(events, minute, EVENT_TYPES.STRAIGHT_RED, offendingTeam.side, { player: offender.name }, rng, {
      playerId: offender.id,
      cardType: 'red',
    });
    events.push(...sendOff(offendingTeam, offender, minute, rng, stats));
    return events;
  }

  const yellowChance =
    CARDS.BASE_YELLOW_CHANCE *
    (1 + shortFuseIntensity * CARDS.SHORT_FUSE_CARD_WEIGHT) *
    (1 + gamesmanshipLevel * GAMESMANSHIP.CARD_RISK_PER_LEVEL) *
    (isScandalous ? COMEDY.SCANDALOUS_FOUL_CARD_WEIGHT : 1) *
    refereeLeniencyWeight(offendingTeam, offender) *
    cardBias;

  let cardGiven = false;
  if (rng.chance(yellowChance)) {
    events.push(...issueYellowCard(offendingTeam, offender, minute, rng, stats));
    cardGiven = true;
  }

  // A scandalous foul's narration ends on the referee looking ready to act
  // (see narration.js) — if nothing actually comes of it, that promise needs
  // a payoff, or it reads as a plot hole. This is skipped by the ref-slap
  // and straight-red branches above since they already return early with a
  // card of their own.
  if (isScandalous && !cardGiven) {
    pushEvent(events, minute, EVENT_TYPES.SCANDALOUS_FOUL_IGNORED, offendingTeam.side, { player: offender.name }, rng);
  }

  let goalkeeperForwardBoost = 1;
  if (
    minute >= DESPERATION.LATE_GAME_MINUTE &&
    scoreSituation(fouledTeam.side, score) === 'losing' &&
    rng.chance(DESPERATION.CHANCE_ON_SET_PIECE)
  ) {
    const keeper = pickGoalkeeper(fouledTeam, rng);
    pushEvent(
      events,
      minute,
      EVENT_TYPES.GOALKEEPER_FORWARD,
      fouledTeam.side,
      { keeper: keeper.name, team: fouledTeam.config.name },
      rng
    );
    stats.goalkeeperForward++;
    goalkeeperForwardBoost = DESPERATION.GOAL_CHANCE_WEIGHT;
  }

  const specialists = activePlayers(fouledTeam).filter((p) => getTraitIntensity(p, 'freeKickSpecialist') > 0);
  if (specialists.length > 0) {
    const specialist = rng.pick(specialists);
    const intensity = getTraitIntensity(specialist, 'freeKickSpecialist');
    const goalChance =
      TRAIT_WEIGHTS.FREE_KICK_GOAL_CHANCE *
      (1 + intensity * TRAIT_WEIGHTS.FREE_KICK_SPECIALIST_WEIGHT) *
      goalkeeperForwardBoost;
    if (rng.chance(goalChance)) {
      const wasWinningBefore = scoreSituation(fouledTeam.side, score) === 'winning';
      if (fouledTeam.side === 'home') score.home++;
      else score.away++;
      const tookTheLead = !wasWinningBefore && scoreSituation(fouledTeam.side, score) === 'winning';

      pushEvent(events, minute, EVENT_TYPES.FREE_KICK_GOAL, fouledTeam.side, { player: specialist.name }, rng, {
        playerId: specialist.id,
      });
      events.push(...maybeSilenceCrowd(fouledTeam, tookTheLead, specialist, minute, rng, stats));
    }
  }

  return events;
}

function triggerBrawl(instigatingTeam, opposingTeam, minute, victimName, rng, stats) {
  const events = [];
  pushEvent(events, minute, EVENT_TYPES.BRAWL, opposingTeam.side, { victim: victimName }, rng);
  stats.brawls++;

  const cardCount = rng.int(COMEDY.BRAWL_CARD_COUNT[0], COMEDY.BRAWL_CARD_COUNT[1]);
  let cardsGiven = 0;
  for (let i = 0; i < cardCount; i++) {
    const side = rng.chance(0.5) ? instigatingTeam : opposingTeam;
    // Weighted by shortFuse, same as who gets picked as a foul's offender —
    // a calm player should resist getting dragged into a brawl more than a
    // short-fused one, not get caught with the same odds as anyone else.
    const player = pickOffender(side, rng);
    if (!player) continue;

    // "Também" ("also") only reads right once someone else has already been
    // carded in this brawl — the first card of the bunch gets its own,
    // presupposition-free wording.
    const cardEventType = cardsGiven === 0 ? EVENT_TYPES.BRAWL_CARD_FIRST : EVENT_TYPES.BRAWL_CARD;
    const becomesRed = rng.chance(COMEDY.BRAWL_RED_CARD_CHANCE) || side.yellowCards.has(player.id);
    pushEvent(events, minute, cardEventType, side.side, { player: player.name }, rng, {
      playerId: player.id,
      cardType: becomesRed ? 'red' : 'yellow',
    });
    cardsGiven++;
    if (becomesRed) {
      events.push(...sendOff(side, player, minute, rng, stats));
    } else {
      side.yellowCards.add(player.id);
      stats.yellowCards[side.side]++;
    }
  }

  return events;
}

function resolveNutmegTaunt(attackingTeam, defendingTeam, minute, rng, stats) {
  const events = [];
  const dribblers = activePlayers(attackingTeam).filter((p) => getTraitIntensity(p, 'dribbler') > 0);
  if (dribblers.length === 0) return events;

  const dribbler = rng.pickWeighted(
    dribblers,
    dribblers.map((p) => getTraitIntensity(p, 'dribbler'))
  );
  const victim = pickTauntVictim(defendingTeam, rng);

  pushEvent(
    events,
    minute,
    EVENT_TYPES.NUTMEG_TAUNT,
    attackingTeam.side,
    { player: dribbler.name, victim: victim.name },
    rng
  );
  stats.nutmegTaunts++;

  if (rng.chance(COMEDY.BRAWL_CHANCE_AFTER_TAUNT)) {
    events.push(...triggerBrawl(attackingTeam, defendingTeam, minute, victim.name, rng, stats));
  }

  return events;
}

function resolveShowboating(team, minute, rng, stats) {
  const events = [];
  const dribblers = activePlayers(team).filter((p) => getTraitIntensity(p, 'dribbler') > 0);
  if (dribblers.length === 0) return events;

  const player = rng.pickWeighted(
    dribblers,
    dribblers.map((p) => getTraitIntensity(p, 'dribbler'))
  );

  pushEvent(
    events,
    minute,
    EVENT_TYPES.SHOWBOATING,
    team.side,
    { player: player.name, team: team.config.name },
    rng,
    { playerId: player.id }
  );
  stats.showboating++;

  return events;
}

// A player-specific special event (see `specialAbility` on a player in the
// club data): unlike traits, which are shared categories applied to any
// number of players, this is bespoke to one individual — their own trigger
// chance and their own narration. When the ability also carries a
// `conversionMultiplier`, it's modeled as a bonus clear-chance attempt for
// that player right after the flavor event (e.g. Heróis de Paris' Talismã).
// `conversionMultiplier` is optional: an ability with none is pure flavor —
// e.g. Edílson's embaixadinhas (see `minLead` in the caller) showboat when
// the game is already comfortable, they don't manufacture a scoring chance
// out of it, so there's nothing to convert.
function resolveSpecialAbility(team, player, minute, score, rng, stats) {
  const events = [];
  const ability = player.specialAbility;

  pushCustomEvent(
    events,
    minute,
    EVENT_TYPES.PLAYER_SPECIAL,
    team.side,
    ability.templates,
    { player: player.name, team: team.config.name },
    rng,
    { playerId: player.id }
  );
  stats.specialAbilities++;

  if (!ability.conversionMultiplier) return events;

  const conversionChance = clamp(ATTACK.CONVERSION_CLEAR_CHANCE * ability.conversionMultiplier, 0, 0.95);
  if (rng.chance(conversionChance)) {
    if (team.side === 'home') score.home++;
    else score.away++;
    pushEvent(
      events,
      minute,
      EVENT_TYPES.GOAL,
      team.side,
      { player: player.name, team: team.config.name },
      rng,
      { playerId: player.id }
    );
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.CHANCE_MISSED,
      team.side,
      { player: player.name, team: team.config.name },
      rng
    );
  }

  return events;
}

function pickShortFuseInstigator(team, rng) {
  const instigators = activePlayers(team).filter((p) => getTraitIntensity(p, 'shortFuse') > 0);
  if (instigators.length === 0) return null;
  return rng.pickWeighted(
    instigators,
    instigators.map((p) => getTraitIntensity(p, 'shortFuse'))
  );
}

function resolveTrashTalk(team, opponent, minute, rng, stats) {
  const events = [];
  const instigator = pickShortFuseInstigator(team, rng);
  if (!instigator) return events;

  const target = pickTauntVictim(opponent, rng);
  pushEvent(events, minute, EVENT_TYPES.TRASH_TALK, team.side, { player: instigator.name, victim: target.name }, rng);
  stats.trashTalks++;

  return events;
}

function resolveFightCallout(team, opponent, minute, rng, stats) {
  const events = [];
  const instigator = pickShortFuseInstigator(team, rng);
  if (!instigator) return events;

  const target = pickTauntVictim(opponent, rng);
  pushEvent(
    events,
    minute,
    EVENT_TYPES.FIGHT_CALLOUT,
    team.side,
    { player: instigator.name, victim: target.name },
    rng
  );
  stats.fightCallouts++;

  if (rng.chance(COMEDY.BRAWL_CHANCE_AFTER_FIGHT_CALLOUT)) {
    events.push(...triggerBrawl(team, opponent, minute, target.name, rng, stats));
  }

  return events;
}

function resolveTimeWasting(team, minute, rng) {
  const events = [];
  pushEvent(events, minute, EVENT_TYPES.TIME_WASTING, team.side, { team: team.config.name }, rng);
  return events;
}

// Delay-of-game card risk reuses the same yellow-chance shape as a foul
// (CARDS.BASE_YELLOW_CHANCE boosted by gamesmanship and referee leniency on
// an already-booked player), just without the shortFuse/scandalous
// multipliers that are specific to fouls.
function delayOfGameCardChance(team, player, gamesmanshipLevel) {
  return (
    CARDS.BASE_YELLOW_CHANCE *
    (1 + gamesmanshipLevel * GAMESMANSHIP.CARD_RISK_PER_LEVEL) *
    refereeLeniencyWeight(team, player)
  );
}

function resolveThrowInDelay(team, minute, gamesmanshipLevel, rng, stats) {
  const events = [];
  const active = activePlayers(team);
  if (active.length === 0) return events;

  const player = rng.pick(active);
  pushEvent(events, minute, EVENT_TYPES.THROW_IN_DELAY, team.side, { player: player.name, team: team.config.name }, rng, {
    playerId: player.id,
  });
  stats.throwInDelays++;

  if (rng.chance(delayOfGameCardChance(team, player, gamesmanshipLevel))) {
    events.push(...issueYellowCard(team, player, minute, rng, stats));
  }

  return events;
}

function resolveGoalKickDelay(team, minute, gamesmanshipLevel, rng, stats) {
  const events = [];
  const keeper = pickGoalkeeper(team, rng);
  pushEvent(events, minute, EVENT_TYPES.GOAL_KICK_DELAY, team.side, { player: keeper.name, team: team.config.name }, rng, {
    playerId: keeper.id,
  });
  stats.goalKickDelays++;

  if (rng.chance(delayOfGameCardChance(team, keeper, gamesmanshipLevel))) {
    events.push(...issueYellowCard(team, keeper, minute, rng, stats));
  }

  return events;
}

// Announces the stoppage time for a half, then — reusing the "home crowd is
// the dominant presence" rule from the WHIFF crowd fix above — checks
// whether the home crowd is unhappy with the call: too little added time
// while not winning (wants more chances to get a better result), or too
// much added time while winning (worried it hands the opponent a way back
// in). Either way it's the same home crowd reacting, just for opposite
// reasons, so they need their own narration rather than sharing templates
// that would otherwise mismatch the situation.
function resolveStoppageAnnouncement(homeTeam, awayTeam, minute, stoppage, range, score, rng, stats) {
  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.STOPPAGE_TIME_ANNOUNCED,
    null,
    { minutes: stoppage, team: homeTeam.config.name, opponent: awayTeam.config.name },
    rng
  );

  const isLow = stoppage <= (range[0] + range[1]) / 2;
  const homeSituation = scoreSituation('home', score);
  const boosOverTooLittle = homeSituation !== 'winning' && isLow;
  const boosOverTooMuch = homeSituation === 'winning' && !isLow;

  if ((boosOverTooLittle || boosOverTooMuch) && rng.chance(MATCH.STOPPAGE_BOO_CHANCE)) {
    pushEvent(
      events,
      minute,
      boosOverTooLittle ? EVENT_TYPES.STOPPAGE_TIME_BOOED_SHORT : EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG,
      homeTeam.side,
      { crowd: homeTeam.config.name },
      rng
    );
    stats.stoppageTimeBooed++;
  }

  return events;
}

// --- Per-minute tick --------------------------------------------------

function simulateMinute(minute, home, away, score, rng, stats, isSecondHalf) {
  const events = [];

  for (const [attacker, defender] of [
    [home, away],
    [away, home],
  ]) {
    const attackPower = teamPower(attacker).attack;
    const defensePower = teamPower(defender).defense;
    let attackChance = ATTACK.BASE_CHANCE_PER_MINUTE * (attackPower / defensePower);
    attackChance *= 1 - rhythmBreakReduction(defender, attacker, minute, score);
    attackChance = clamp(attackChance, ATTACK.CHANCE_RANGE[0], ATTACK.CHANCE_RANGE[1]);

    if (rng.chance(attackChance)) {
      events.push(...resolveAttack(attacker, defender, minute, score, rng, stats));
    }
  }

  for (const [offender, fouled] of [
    [home, away],
    [away, home],
  ]) {
    const gamesmanshipLevel = effectiveGamesmanship(offender, fouled, minute, score);
    const dribblerIntensity = sumTraitIntensity(activePlayers(fouled), 'dribbler');
    const foulChance =
      FOUL.BASE_CHANCE_PER_MINUTE *
      (1 + gamesmanshipLevel * GAMESMANSHIP.TACTICAL_FOUL_RATE_PER_LEVEL) *
      (1 + dribblerIntensity * FOUL.DRIBBLER_OPPONENT_FOUL_WEIGHT);

    if (rng.chance(foulChance)) {
      events.push(...resolveFoul(offender, fouled, minute, score, rng, stats));
    }
  }

  for (const [team, opponent] of [
    [home, away],
    [away, home],
  ]) {
    const dribblerIntensity = sumTraitIntensity(activePlayers(team), 'dribbler');
    if (dribblerIntensity === 0) continue;
    if (rng.chance(dribblerIntensity * COMEDY.NUTMEG_TAUNT_CHANCE_PER_INTENSITY)) {
      events.push(...resolveNutmegTaunt(team, opponent, minute, rng, stats));
    }
  }

  for (const [team, opponent] of [
    [home, away],
    [away, home],
  ]) {
    const shortFuseIntensity = sumTraitIntensity(activePlayers(team), 'shortFuse');
    if (shortFuseIntensity === 0) continue;
    if (rng.chance(shortFuseIntensity * COMEDY.TRASH_TALK_CHANCE_PER_SHORT_FUSE_INTENSITY)) {
      events.push(...resolveTrashTalk(team, opponent, minute, rng, stats));
    }
    if (rng.chance(shortFuseIntensity * COMEDY.FIGHT_CALLOUT_CHANCE_PER_SHORT_FUSE_INTENSITY)) {
      events.push(...resolveFightCallout(team, opponent, minute, rng, stats));
    }
  }

  for (const [team, opponent] of [
    [home, away],
    [away, home],
  ]) {
    const level = effectiveGamesmanship(team, opponent, minute, score);
    if (level === 0) continue;
    // Blatant flavor (gandulas hiding every ball, a fake medical timeout)
    // only reads as believable once the match is genuinely running out —
    // see GAMESMANSHIP.TIME_WASTING_MIN_MINUTE. The milder delays below
    // stay ungated: a slow throw-in makes sense from kickoff on.
    if (minute >= GAMESMANSHIP.TIME_WASTING_MIN_MINUTE && rng.chance(level * GAMESMANSHIP.TIME_WASTING_EVENT_CHANCE_PER_LEVEL)) {
      events.push(...resolveTimeWasting(team, minute, rng));
    }
    if (rng.chance(level * GAMESMANSHIP.THROW_IN_DELAY_CHANCE_PER_LEVEL)) {
      events.push(...resolveThrowInDelay(team, minute, level, rng, stats));
    }
    if (rng.chance(level * GAMESMANSHIP.GOAL_KICK_DELAY_CHANCE_PER_LEVEL)) {
      events.push(...resolveGoalKickDelay(team, minute, level, rng, stats));
    }
  }

  if (isSecondHalf) {
    for (const team of [home, away]) {
      if (goalMargin(team.side, score) < 2) continue;
      const dribblerIntensity = sumTraitIntensity(activePlayers(team), 'dribbler');
      if (dribblerIntensity === 0) continue;
      if (rng.chance(dribblerIntensity * COMEDY.SHOWBOATING_CHANCE_PER_INTENSITY)) {
        events.push(...resolveShowboating(team, minute, rng, stats));
      }
    }
  }

  for (const team of [home, away]) {
    for (const player of activePlayers(team)) {
      if (!player.specialAbility) continue;
      // Optional: an ability can require the team to already be ahead by at
      // least this many goals before it's even rolled for — e.g. Edílson's
      // embaixadinhas only make sense (and only happened, in the real 1999
      // game this is modeled on) once the result is already comfortable, not
      // at any moment in a close match. Abilities with no `minLead` roll
      // every minute regardless of score, same as before this field existed.
      if (player.specialAbility.minLead && goalMargin(team.side, score) < player.specialAbility.minLead) continue;
      if (rng.chance(player.specialAbility.chancePerMinute)) {
        events.push(...resolveSpecialAbility(team, player, minute, score, rng, stats));
      }
    }
  }

  return events;
}

// --- Public API -------------------------------------------------------

/**
 * Simulates a full match minute by minute.
 * @param {object} params
 * @param {{name:string, lineup:object[], posture:'attacking'|'balanced'|'defensive', gamesmanship:number}} params.home
 * @param {{name:string, lineup:object[], posture:'attacking'|'balanced'|'defensive', gamesmanship:number}} params.away
 * @param {ReturnType<import('./rng.js').createRng>} params.rng
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
    specialAbilities: 0,
    stoppageTimeBooed: 0,
    throwInDelays: 0,
    goalKickDelays: 0,
    officialsAssaulted: 0,
    handballsOnTheLine: 0,
    matchAbandoned: false,
    standInGoalkeepers: 0,
  };
  const events = [];

  pushEvent(events, 0, EVENT_TYPES.KICKOFF, null, { team: home.name, opponent: away.name }, rng);

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
          stats
        )
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
          stats
        )
      );
    }

    if (minute === firstHalfEnd) {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.HALFTIME,
        null,
        { team: home.name, opponent: away.name, homeGoals: score.home, awayGoals: score.away },
        rng
      );
    }
  }

  pushEvent(
    events,
    finalMinute,
    EVENT_TYPES.FULLTIME,
    null,
    { team: home.name, opponent: away.name, homeGoals: score.home, awayGoals: score.away },
    rng
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
    // goalkeeper (see maybeAssignStandInGoalkeeper) — if regulation ended
    // with an outfield player in goal, the shootout should keep facing that
    // same player, not roll a fresh random one for every kick.
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
      specialAbilities: stats.specialAbilities,
      stoppageTimeBooed: stats.stoppageTimeBooed,
      throwInDelays: stats.throwInDelays,
      goalKickDelays: stats.goalKickDelays,
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
        rng
      );
      mindGamesMultiplier = PENALTY.MIND_GAMES_MISS_WEIGHT;
    }

    const wallIntensity = getTraitIntensity(keeper, 'wall');
    const sharpshooterIntensity = getTraitIntensity(kicker, 'sharpshooter');
    // An outfield player standing in for a sent-off goalkeeper (see
    // maybeAssignStandInGoalkeeper) has no idea how to read a penalty —
    // easier for the kicker to convert than against a real keeper.
    const standInMultiplier = defendingTeam.standInGoalkeeperId ? GOALKEEPER.STAND_IN_PENALTY_MISS_MULTIPLIER : 1;
    const missChance = clamp(
      PENALTY.BASE_MISS_CHANCE *
        (1 + wallIntensity * PENALTY.WALL_MISS_WEIGHT) *
        (1 - sharpshooterIntensity * PENALTY.SHARPSHOOTER_MISS_REDUCTION) *
        mindGamesMultiplier *
        standInMultiplier,
      PENALTY.MISS_CHANCE_FLOOR,
      PENALTY.MISS_CHANCE_CEIL
    );

    const context = { player: kicker.name, keeper: keeper.name, team: kickingTeam.config.name };
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
  pushEvent(events, minute, EVENT_TYPES.SHOOTOUT_WINNER, winnerSide, { team: winnerTeam.config.name }, rng);

  return { winnerSide, homeScore: score.home, awayScore: score.away, events };
}
