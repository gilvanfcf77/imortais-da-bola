// Match-situational multipliers derived from a team's traits — "how much
// does having a leader/wall/cynicalFouler on the pitch bend this specific
// moment", built on top of the generic trait primitives in ../traits.js
// (which just answer "what intensity does this player have"). Catimba's
// effective level itself lives here too, since every one of these depends
// on knowing whether a team is currently in a "worth stalling for" position.

import { GAMESMANSHIP, TRAIT_WEIGHTS, LEADER } from '../constants.js';
import { sumTraitIntensity } from '../traits.js';
import { activePlayers, scoreSituation, isUnderdog } from './teamState.js';

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
// kickoff — see isUnderdog in teamState.js. This is the PLAYERS' own
// instinct under pressure, not a manager's tactical dial, which is why it's
// additive (never lowers a deliberately higher setting) rather than
// something the user configures.
export function effectiveGamesmanship(team, opponent, minute, score) {
  const situation = scoreSituation(team.side, score);
  if (situation === 'losing') return 0;
  const configured = team.config.gamesmanship ?? 0;
  if (
    situation === 'winning' &&
    minute >= GAMESMANSHIP.UNDERDOG_LATE_GAME_MINUTE &&
    isUnderdog(team, opponent)
  ) {
    return Math.max(configured, GAMESMANSHIP.UNDERDOG_INSTINCTIVE_LEVEL);
  }
  return configured;
}

// Every team playing for time gets a baseline rhythm-break benefit — see
// RHYTHM_BREAK_BASE_PER_LEVEL's own comment for why this isn't gated on
// cynicalFouler the way it used to be. cynicalFouler intensity stacks on
// top as a pure amplifier, so a team built around nasty operators still
// gets meaningfully more out of the same catimba level than one without.
export function rhythmBreakReduction(team, opponent, minute, score) {
  const level = effectiveGamesmanship(team, opponent, minute, score);
  if (level === 0) return 0;
  const cynicalIntensity = sumTraitIntensity(activePlayers(team), 'cynicalFouler');
  const reduction =
    level * GAMESMANSHIP.RHYTHM_BREAK_BASE_PER_LEVEL +
    level * cynicalIntensity * GAMESMANSHIP.RHYTHM_BREAK_PER_CYNICAL_INTENSITY;
  return Math.min(GAMESMANSHIP.RHYTHM_BREAK_CAP, reduction);
}

export function wallReductionMultiplier(defendingTeam) {
  const intensity = sumTraitIntensity(activePlayers(defendingTeam), 'wall');
  if (intensity === 0) return 1;
  const reduction = Math.min(
    TRAIT_WEIGHTS.WALL_REDUCTION_CAP,
    intensity * TRAIT_WEIGHTS.WALL_REDUCTION_PER_INTENSITY,
  );
  return 1 - reduction;
}

export function leaderHoldMultiplier(defendingTeam, minute, score) {
  if (minute < LEADER.LATE_GAME_MINUTE) return 1;
  if (scoreSituation(defendingTeam.side, score) === 'losing') return 1;
  const intensity = sumTraitIntensity(activePlayers(defendingTeam), 'leader');
  if (intensity === 0) return 1;
  return Math.max(LEADER.HOLD_RESULT_FLOOR, 1 - intensity * LEADER.HOLD_RESULT_WEIGHT);
}

export function leaderComebackMultiplier(attackingTeam, score) {
  if (scoreSituation(attackingTeam.side, score) !== 'losing') return 1;
  const intensity = sumTraitIntensity(activePlayers(attackingTeam), 'leader');
  if (intensity === 0) return 1;
  return Math.min(LEADER.COMEBACK_CAP, 1 + intensity * LEADER.COMEBACK_WEIGHT);
}
