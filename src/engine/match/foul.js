// Fouls and their fallout: the tackle itself (resolveFoul, including its
// handoffs to a penalty for a goalkeeper's own foul or a wrongly-spotted
// free kick), the mass-card brawl a taunt can spiral into (triggerBrawl),
// and the two dribbler-flavor provocations that can trigger one
// (resolveNutmegTaunt, resolveShowboating).

import {
  PENALTY,
  COMEDY,
  INJURY,
  CARDS,
  GAMESMANSHIP,
  DESPERATION,
  TRAIT_WEIGHTS,
} from '../constants.js';
import { getTraitIntensity } from '../traits.js';
import { EVENT_TYPES } from '../narration/index.js';
import { activePlayers, scoreSituation } from './teamState.js';
import { pushEvent } from './events.js';
import { pickOffender, pickFinisher, pickTauntVictim, pickGoalkeeper } from './playerPicking.js';
import {
  sendOff,
  issueYellowCard,
  refereeLeniencyWeight,
  refereeBiasMultiplier,
} from './discipline.js';
import { effectiveGamesmanship } from './traitEffects.js';
import { resolvePenalty, maybeSilenceCrowd } from './attack.js';

export function triggerBrawl(instigatingTeam, opposingTeam, minute, victimName, rng, stats) {
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

export function resolveNutmegTaunt(attackingTeam, defendingTeam, minute, rng, stats) {
  const events = [];
  const dribblers = activePlayers(attackingTeam).filter(
    (p) => getTraitIntensity(p, 'dribbler') > 0,
  );
  if (dribblers.length === 0) return events;

  const dribbler = rng.pickWeighted(
    dribblers,
    dribblers.map((p) => getTraitIntensity(p, 'dribbler')),
  );
  const victim = pickTauntVictim(defendingTeam, rng);

  pushEvent(
    events,
    minute,
    EVENT_TYPES.NUTMEG_TAUNT,
    attackingTeam.side,
    { player: dribbler.name, victim: victim.name },
    rng,
  );
  stats.nutmegTaunts++;

  if (rng.chance(COMEDY.BRAWL_CHANCE_AFTER_TAUNT)) {
    events.push(...triggerBrawl(attackingTeam, defendingTeam, minute, victim.name, rng, stats));
  }

  return events;
}

export function resolveShowboating(team, minute, rng, stats) {
  const events = [];
  const dribblers = activePlayers(team).filter((p) => getTraitIntensity(p, 'dribbler') > 0);
  if (dribblers.length === 0) return events;

  const player = rng.pickWeighted(
    dribblers,
    dribblers.map((p) => getTraitIntensity(p, 'dribbler')),
  );

  pushEvent(
    events,
    minute,
    EVENT_TYPES.SHOWBOATING,
    team.side,
    { player: player.name, team: team.config },
    rng,
    { playerId: player.id },
  );
  stats.showboating++;

  return events;
}

export function resolveFoul(offendingTeam, fouledTeam, minute, score, rng, stats) {
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
    return resolvePenalty(
      fouledTeam,
      offendingTeam,
      finisher,
      minute,
      score,
      rng,
      stats,
      'wrongLocation',
    );
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
      { player: offender.name, victim: victim.name, opponent: fouledTeam.config },
      rng,
    );
    stats.scandalousFouls++;
  } else {
    // Not every FOUL template needs a victim (most just narrate the tackle
    // itself), but some do ("agarrou a camisa" needs to say whose shirt) —
    // picking one here and always passing it through is cheaper and safer
    // than threading a second pushEvent variant just for those templates.
    // Reuses pickTauntVictim's same defender-leaning pick as
    // SCANDALOUS_FOUL above, for the same reason (a fouled outfield player
    // is usually a defender contesting the ball).
    const victim = pickTauntVictim(fouledTeam, rng);
    pushEvent(
      events,
      minute,
      EVENT_TYPES.FOUL,
      offendingTeam.side,
      { player: offender.name, victim: victim.name, opponent: fouledTeam.config },
      rng,
    );
  }

  const injuryChance =
    INJURY.SEVERE_INJURY_CHANCE * (isScandalous ? INJURY.SCANDALOUS_INJURY_WEIGHT : 1);
  if (rng.chance(injuryChance)) {
    const injuredPlayer = pickTauntVictim(fouledTeam, rng);
    fouledTeam.injuries.set(
      injuredPlayer.id,
      Math.max(fouledTeam.injuries.get(injuredPlayer.id) ?? 0, INJURY.INJURED_OVERALL_PENALTY),
    );
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SEVERE_INJURY,
      offendingTeam.side,
      { player: offender.name, victim: injuredPlayer.name },
      rng,
      { victimId: injuredPlayer.id },
    );
    stats.severeInjuries++;

    if (rng.chance(INJURY.NO_CARD_DESPITE_INJURY_CHANCE)) {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.NO_CARD_DESPITE_INJURY,
        offendingTeam.side,
        { player: offender.name, victim: injuredPlayer.name },
        rng,
      );
      stats.noCardDespiteInjury++;
      return events;
    }
  }

  if (
    shortFuseIntensity > 0 &&
    rng.chance(shortFuseIntensity * COMEDY.OFFICIAL_ASSAULT_CHANCE_PER_INTENSITY)
  ) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.OFFICIAL_ASSAULTED,
      offendingTeam.side,
      { player: offender.name },
      rng,
      {
        playerId: offender.id,
        cardType: 'red',
      },
    );
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
    CARDS.BASE_STRAIGHT_RED_CHANCE *
    (1 + gamesmanshipLevel * GAMESMANSHIP.CARD_RISK_PER_LEVEL) *
    cardBias;
  if (rng.chance(straightRedChance)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.STRAIGHT_RED,
      offendingTeam.side,
      { player: offender.name },
      rng,
      {
        playerId: offender.id,
        cardType: 'red',
      },
    );
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
  // (see narration/) — if nothing actually comes of it, that promise needs
  // a payoff, or it reads as a plot hole. This is skipped by the ref-slap
  // and straight-red branches above since they already return early with a
  // card of their own.
  if (isScandalous && !cardGiven) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SCANDALOUS_FOUL_IGNORED,
      offendingTeam.side,
      { player: offender.name },
      rng,
    );
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
      { keeper: keeper.name, team: fouledTeam.config },
      rng,
    );
    stats.goalkeeperForward++;
    goalkeeperForwardBoost = DESPERATION.GOAL_CHANCE_WEIGHT;
  }

  const specialists = activePlayers(fouledTeam).filter(
    (p) => getTraitIntensity(p, 'freeKickSpecialist') > 0,
  );
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

      pushEvent(
        events,
        minute,
        EVENT_TYPES.FREE_KICK_GOAL,
        fouledTeam.side,
        { player: specialist.name },
        rng,
        {
          playerId: specialist.id,
        },
      );
      events.push(...maybeSilenceCrowd(fouledTeam, tookTheLead, specialist, minute, rng, stats));
    }
  }

  return events;
}
