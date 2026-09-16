// Team-state and team-strength calculations: creating a team's mutable match
// state, the active (not-sent-off, injury-adjusted) roster on the pitch at
// any moment, and the attack/defense power numbers that drive
// simulateMinute's attack-chance roll. No RNG, no events — pure reads over a
// team/score, which is what makes this the lowest-level module in match/
// (everything else either computes from these or resolves an event on top
// of them).

import { POSTURE_MODIFIERS, CARDS, GOALKEEPER, GAMESMANSHIP } from '../constants.js';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createTeamState(config, side) {
  return {
    config, // { name, lineup, posture, gamesmanship }
    side, // 'home' | 'away'
    redCards: new Set(),
    yellowCards: new Set(),
    injuries: new Map(), // playerId -> overall penalty, for the rest of the match
    // Set once the team has no goalkeeper-position player left on the pitch
    // — see discipline.js's maybeAssignStandInGoalkeeper.
    standInGoalkeeperId: null,
  };
}

export function activePlayers(team) {
  return team.config.lineup
    .filter((p) => !team.redCards.has(p.id))
    .map((p) => {
      const penalty = team.injuries.get(p.id);
      return penalty ? { ...p, overall: Math.max(1, p.overall - penalty) } : p;
    });
}

export function sectorStrength(players, positions) {
  const group = players.filter((p) => positions.includes(p.position));
  if (group.length === 0) return 60; // neutral fallback if a sector is empty
  return group.reduce((sum, p) => sum + p.overall, 0) / group.length;
}

export function teamPower(team) {
  const active = activePlayers(team);
  const numericFactor = active.length / team.config.lineup.length;
  // A team down a player still creates chances at close to its usual rate,
  // but should suffer more on the defensive end — an extra cut on top of the
  // proportional one above, defense only.
  const defenseFactor =
    active.length < team.config.lineup.length
      ? numericFactor * CARDS.SHORT_HANDED_DEFENSE_PENALTY
      : numericFactor;
  // On top of the short-handed cut above — an outfield player standing in
  // for a sent-off goalkeeper (see discipline.js's maybeAssignStandInGoalkeeper)
  // is that much more exposed on his own, independent of just being a man down.
  const standInGoalkeeperFactor = team.standInGoalkeeperId
    ? GOALKEEPER.STAND_IN_DEFENSE_PENALTY
    : 1;
  const mods = POSTURE_MODIFIERS[team.config.posture];
  return {
    attack: sectorStrength(active, ['FW', 'MF']) * mods.attack * numericFactor,
    defense:
      sectorStrength(active, ['CB', 'FB', 'GK']) *
      mods.defense *
      defenseFactor *
      standInGoalkeeperFactor,
  };
}

export function scoreSituation(side, score) {
  const own = side === 'home' ? score.home : score.away;
  const opponent = side === 'home' ? score.away : score.home;
  if (own > opponent) return 'winning';
  if (own < opponent) return 'losing';
  return 'drawing';
}

export function goalMargin(side, score) {
  const own = side === 'home' ? score.home : score.away;
  const opponent = side === 'home' ? score.away : score.home;
  return own - opponent;
}

function averageOverall(players) {
  if (players.length === 0) return 60; // neutral fallback, mirrors sectorStrength's
  return players.reduce((sum, p) => sum + p.overall, 0) / players.length;
}

// A big-underdog-nursing-a-shock-lead situation — see
// GAMESMANSHIP.UNDERDOG_* in constants.js. Used by traitEffects.js's
// effectiveGamesmanship, kept here alongside averageOverall since both are
// just team-strength comparisons, not gamesmanship logic themselves.
export function isUnderdog(team, opponent) {
  return (
    averageOverall(activePlayers(opponent)) - averageOverall(activePlayers(team)) >=
    GAMESMANSHIP.UNDERDOG_OVERALL_GAP
  );
}
