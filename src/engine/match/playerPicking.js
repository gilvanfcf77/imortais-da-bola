// "Who does this event happen to" — every RNG-weighted selector that picks
// a player out of a team for an event, grouped together since they all
// share the same rng.pick/rng.pickWeighted-over-activePlayers shape and are
// easiest to scan (and calibrate) side by side.

import { ATTACK, TRAIT_WEIGHTS, CARDS } from '../constants.js';
import { getTraitIntensity } from '../traits.js';
import { activePlayers } from './teamState.js';

// `exclude` (optional) is a Set of player ids to skip — used by the penalty
// shootout to avoid the same kicker going twice before everyone else has had
// a turn. Falls back to the full active roster once everyone in it is
// excluded (nobody left to pick from otherwise).
export function pickFinisher(team, rng, exclude) {
  const active = activePlayers(team).filter((p) => !exclude?.has(p.id));
  const pool = active.length > 0 ? active : activePlayers(team);
  const candidates = pool.filter((p) => ATTACK.FINISHER_WEIGHT[p.position]);
  if (candidates.length === 0) return rng.pick(pool);
  const weights = candidates.map(
    (p) =>
      ATTACK.FINISHER_WEIGHT[p.position] +
      getTraitIntensity(p, 'sharpshooter') * TRAIT_WEIGHTS.SHARPSHOOTER_FINISHER_SELECTION_WEIGHT,
  );
  return rng.pickWeighted(candidates, weights);
}

export function pickSetPieceTaker(team, rng, exclude) {
  const active = activePlayers(team).filter((p) => !exclude?.has(p.id));
  const pool = active.length > 0 ? active : activePlayers(team);
  return rng.pickWeighted(
    pool,
    pool.map(
      (p) =>
        1 +
        getTraitIntensity(p, 'sharpshooter') *
          TRAIT_WEIGHTS.SHARPSHOOTER_FINISHER_SELECTION_WEIGHT +
        getTraitIntensity(p, 'freeKickSpecialist') * TRAIT_WEIGHTS.SET_PIECE_SPECIALIST_WEIGHT,
    ),
  );
}

// A direct free kick specifically — unlike pickSetPieceTaker above (shared
// with penalties, where any outfield player stepping up is plausible),
// this narrows the pool to midfielders and forwards first: in real
// football a free kick in range is essentially never left to a defender or
// goalkeeper with no reputation for it. A `freeKickSpecialist` stays
// eligible regardless of position, though — real-world Rogério Ceni (São
// Paulo, curated with this trait despite being a goalkeeper) is exactly
// the exception this carve-out exists for. Falls back to the full active
// roster only in the freak case a team has neither an MF/FW nor a
// specialist on the pitch.
export function pickFreeKickTaker(team, rng) {
  const active = activePlayers(team);
  const eligible = active.filter(
    (p) =>
      p.position === 'MF' || p.position === 'FW' || getTraitIntensity(p, 'freeKickSpecialist') > 0,
  );
  const pool = eligible.length > 0 ? eligible : active;
  return rng.pickWeighted(
    pool,
    pool.map(
      (p) =>
        1 +
        getTraitIntensity(p, 'sharpshooter') *
          TRAIT_WEIGHTS.SHARPSHOOTER_FINISHER_SELECTION_WEIGHT +
        getTraitIntensity(p, 'freeKickSpecialist') * TRAIT_WEIGHTS.SET_PIECE_SPECIALIST_WEIGHT,
    ),
  );
}

export function pickOffender(team, rng) {
  const candidates = activePlayers(team);
  const weights = candidates.map((p) => {
    const base = p.position === 'GK' ? CARDS.GOALKEEPER_OFFENDER_WEIGHT : 1;
    return base + getTraitIntensity(p, 'shortFuse') * CARDS.SHORT_FUSE_OFFENDER_WEIGHT;
  });
  return rng.pickWeighted(candidates, weights);
}

export function pickTauntVictim(team, rng) {
  const active = activePlayers(team);
  const defenders = active.filter((p) => p.position === 'CB' || p.position === 'FB');
  return rng.pick(defenders.length > 0 ? defenders : active);
}

// Who gets fouled — used only for resolveFoul's FOUL/SCANDALOUS_FOUL victim
// (foul.js), not for pickTauntVictim's other, unrelated uses (a goal's
// beaten defender, an injury pick, a trash-talk target). Any outfield
// player can be fouled in real football — this deliberately does NOT
// restrict the pool to defenders the way pickTauntVictim's uniform pick
// does. Two traits make a specific player stand out instead: `dribbler`
// (a real player who beats defenders draws real fouls from them — on top
// of FOUL.DRIBBLER_OPPONENT_FOUL_WEIGHT, which already raises the whole
// team's foul rate but says nothing about WHO on that team it happens to)
// and `flopper` (deliberately wins fouls by going down easily — a bigger
// per-point weight than dribbler's, since drawing the foul is the whole
// point of the trait, not a side effect of skill). The goalkeeper is
// excluded: an open-play foul on a keeper is vanishingly rare in real
// football, and keeper-specific moments (a save, a handball on the line)
// already have their own dedicated events elsewhere.
export function pickFouledPlayer(team, rng) {
  const candidates = activePlayers(team).filter((p) => p.position !== 'GK');
  const weights = candidates.map(
    (p) =>
      1 +
      getTraitIntensity(p, 'dribbler') * TRAIT_WEIGHTS.DRIBBLER_FOULED_SELECTION_WEIGHT +
      getTraitIntensity(p, 'flopper') * TRAIT_WEIGHTS.FLOPPER_FOULED_SELECTION_WEIGHT,
  );
  return rng.pickWeighted(candidates, weights);
}

export function pickGoalkeeper(team, rng) {
  const active = activePlayers(team);
  // Once a specific outfield player has taken over in goal (see
  // discipline.js's maybeAssignStandInGoalkeeper), every later "the
  // goalkeeper does X" moment should keep naming that same player, not a
  // fresh random pick each time — same person, whole rest of the match,
  // same as a real improvised keeper.
  if (team.standInGoalkeeperId) {
    const standIn = active.find((p) => p.id === team.standInGoalkeeperId);
    if (standIn) return standIn;
  }
  const keepers = active.filter((p) => p.position === 'GK');
  return rng.pick(keepers.length > 0 ? keepers : active);
}

export function pickShortFuseInstigator(team, rng) {
  const instigators = activePlayers(team).filter((p) => getTraitIntensity(p, 'shortFuse') > 0);
  if (instigators.length === 0) return null;
  return rng.pickWeighted(
    instigators,
    instigators.map((p) => getTraitIntensity(p, 'shortFuse')),
  );
}
