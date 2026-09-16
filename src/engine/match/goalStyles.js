// Which flavor a goal takes (plain, individual, assisted, corner, long shot,
// a defensive/goalkeeper blunder) and the event-type lookups resolveAttack
// and simulateMinute need to recognize a goal was scored this minute.

import { GOAL_STYLE, TRAIT_WEIGHTS, GOALKEEPER } from '../constants.js';
import { getTraitIntensity } from '../traits.js';
import { EVENT_TYPES } from '../narration/index.js';

export const GOAL_STYLE_EVENT_TYPE = {
  plain: EVENT_TYPES.GOAL,
  individual: EVENT_TYPES.GOAL_INDIVIDUAL,
  assisted: EVENT_TYPES.GOAL_ASSISTED,
  corner: EVENT_TYPES.GOAL_CORNER,
  longShot: EVENT_TYPES.GOAL_LONG_SHOT,
  defensiveBlunder: EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER,
  goalkeeperBlunder: EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER,
};

// Every event type that means a goal actually went in — used to spot, from
// this minute's event list, whether a team just scored and might celebrate
// its way into a GOAL_CELEBRATION_STALL. DISALLOWED_GOAL is deliberately
// left out: it means the goal didn't count.
export const GOAL_SCORED_EVENT_TYPES = new Set([
  ...Object.values(GOAL_STYLE_EVENT_TYPE),
  EVENT_TYPES.GOAL_ANOTHER,
  EVENT_TYPES.GOAL_REFEREE_DEFLECTION,
  EVENT_TYPES.GOAL_HANDBALL,
  EVENT_TYPES.GOAL_PENALTY,
  EVENT_TYPES.FREE_KICK_GOAL,
]);

// `opponentHasStandInGoalkeeper`: the attacking side deliberately shoots
// from distance more often against an outfield player standing in as
// goalkeeper (see discipline.js's maybeAssignStandInGoalkeeper) — a
// tactical choice by the attackers, not some automatic side effect of the
// defense being weaker.
export function pickGoalStyle(rng, finisher, opponentHasStandInGoalkeeper) {
  const dribblerIntensity = getTraitIntensity(finisher, 'dribbler');
  const styles = Object.keys(GOAL_STYLE.WEIGHTS);
  const weights = styles.map((style) => {
    const base = GOAL_STYLE.WEIGHTS[style];
    if (style === 'individual')
      return base * (1 + dribblerIntensity * TRAIT_WEIGHTS.DRIBBLER_INDIVIDUAL_GOAL_WEIGHT);
    if (style === 'longShot' && opponentHasStandInGoalkeeper)
      return base * GOALKEEPER.OPPONENT_LONG_SHOT_WEIGHT;
    return base;
  });
  return rng.pickWeighted(styles, weights);
}
