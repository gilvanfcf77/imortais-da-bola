// The per-tick orchestrator: for one minute, rolls each side's chance to
// attack, foul, nutmeg-taunt, trash-talk/fight-callout, and (once catimba is
// active) stall for time — plus, in the second half, showboat while up by
// two or more, and roll every player-specific special ability once. Every
// number here lives in constants.js; this file just wires the rolls
// together in order.

import { ATTACK, FOUL, GAMESMANSHIP, COMEDY } from '../constants.js';
import { sumTraitIntensity } from '../traits.js';
import { clamp, teamPower, activePlayers, goalMargin } from './teamState.js';
import { rhythmBreakReduction, effectiveGamesmanship } from './traitEffects.js';
import { resolveAttack } from './attack.js';
import { resolveFoul, resolveNutmegTaunt, resolveShowboating } from './foul.js';
import {
  resolveTrashTalk,
  resolveFightCallout,
  resolveTimeWasting,
  resolveThrowInDelay,
  resolveGoalKickDelay,
  resolveGoalCelebrationStall,
} from './gamesmanship.js';
import { resolveSpecialAbility } from './specialAbility.js';
import { GOAL_SCORED_EVENT_TYPES } from './goalStyles.js';

export function simulateMinute(minute, home, away, score, rng, stats, isSecondHalf) {
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
    // A `flopper` manufactures fouls on purpose, not just as a side effect
    // of beating defenders like `dribbler` — so it raises the team's own
    // foul rate too, on top of pickFouledPlayer weighting who specifically
    // it happens to once a foul is already rolled (playerPicking.js).
    const flopperIntensity = sumTraitIntensity(activePlayers(fouled), 'flopper');
    const foulChance =
      FOUL.BASE_CHANCE_PER_MINUTE *
      (1 + gamesmanshipLevel * GAMESMANSHIP.TACTICAL_FOUL_RATE_PER_LEVEL) *
      (1 +
        dribblerIntensity * FOUL.DRIBBLER_OPPONENT_FOUL_WEIGHT +
        flopperIntensity * FOUL.FLOPPER_OPPONENT_FOUL_WEIGHT);

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
    if (
      minute >= GAMESMANSHIP.TIME_WASTING_MIN_MINUTE &&
      rng.chance(level * GAMESMANSHIP.TIME_WASTING_EVENT_CHANCE_PER_LEVEL)
    ) {
      events.push(...resolveTimeWasting(team, minute, rng));
    }
    if (rng.chance(level * GAMESMANSHIP.THROW_IN_DELAY_CHANCE_PER_LEVEL)) {
      events.push(...resolveThrowInDelay(team, minute, level, rng, stats));
    }
    if (rng.chance(level * GAMESMANSHIP.GOAL_KICK_DELAY_CHANCE_PER_LEVEL)) {
      events.push(...resolveGoalKickDelay(team, minute, level, rng, stats));
    }
  }

  // A team that just scored this minute may milk the celebration for time —
  // gated on minute and on having a cynicalFouler on the pitch, same as
  // every other catimba payoff (CLAUDE.md: "eficácia depende de ter
  // catimbeiros em campo"). Checked after the score-affecting resolvers
  // above/before it in this tick, so `score` and `events` already reflect
  // any goal scored this minute.
  if (minute >= GAMESMANSHIP.GOAL_CELEBRATION_STALL_MIN_MINUTE) {
    for (const [team, opponent] of [
      [home, away],
      [away, home],
    ]) {
      const scoredThisMinute = events.some(
        (event) => event.side === team.side && GOAL_SCORED_EVENT_TYPES.has(event.type),
      );
      if (!scoredThisMinute) continue;
      if (sumTraitIntensity(activePlayers(team), 'cynicalFouler') === 0) continue;

      const level = effectiveGamesmanship(team, opponent, minute, score);
      if (level === 0) continue;
      if (rng.chance(level * GAMESMANSHIP.GOAL_CELEBRATION_STALL_CHANCE_PER_LEVEL)) {
        events.push(...resolveGoalCelebrationStall(team, minute, level, rng, stats));
      }
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
      if (
        player.specialAbility.minLead &&
        goalMargin(team.side, score) < player.specialAbility.minLead
      )
        continue;
      if (rng.chance(player.specialAbility.chancePerMinute)) {
        events.push(...resolveSpecialAbility(team, player, minute, score, rng, stats));
      }
    }
  }

  return events;
}
