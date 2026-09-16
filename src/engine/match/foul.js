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
  FOUL,
} from '../constants.js';
import { getTraitIntensity } from '../traits.js';
import { EVENT_TYPES } from '../narration/index.js';
import { activePlayers, scoreSituation } from './teamState.js';
import { pushEvent } from './events.js';
import {
  pickOffender,
  pickFinisher,
  pickTauntVictim,
  pickFouledPlayer,
  pickGoalkeeper,
  pickFreeKickTaker,
  pickFlopper,
} from './playerPicking.js';
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
  // A real foul, but the referee stops play for it instead of letting the
  // advantage law run — unlike PENALTY_PHANTOM/PENALTY_WRONG_LOCATION
  // above, nothing was actually called wrong, just badly timed, denying the
  // fouled side whatever promising attack `victim` was about to make.
  // Mutually exclusive with isScandalous — a scandalous foul is dramatic
  // enough on its own without also being an advantage-law blunder.
  const isAdvantageIgnored = !isScandalous && rng.chance(FOUL.ADVANTAGE_IGNORED_CHANCE);

  if (isScandalous) {
    const victim = pickFouledPlayer(fouledTeam, rng);
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SCANDALOUS_FOUL,
      offendingTeam.side,
      { player: offender.name, victim: victim.name, opponent: fouledTeam.config },
      rng,
    );
    stats.scandalousFouls++;
  } else if (isAdvantageIgnored) {
    const victim = pickFouledPlayer(fouledTeam, rng);
    pushEvent(
      events,
      minute,
      EVENT_TYPES.ADVANTAGE_IGNORED,
      offendingTeam.side,
      { player: offender.name, victim: victim.name, opponent: fouledTeam.config },
      rng,
    );
    stats.advantageIgnored++;
  } else {
    // Not every FOUL template needs a victim (most just narrate the tackle
    // itself), but some do ("agarrou a camisa" needs to say whose shirt) —
    // picking one here and always passing it through is cheaper and safer
    // than threading a second pushEvent variant just for those templates.
    // pickFouledPlayer, same as SCANDALOUS_FOUL above: any outfield player
    // can be picked, weighted up for `dribbler`/`flopper` (see its own doc
    // comment).
    const victim = pickFouledPlayer(fouledTeam, rng);
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

  events.push(...attemptFreeKick(fouledTeam, minute, score, rng, stats));

  return events;
}

// The direct free kick itself, shared by a real foul (resolveFoul above)
// and a phantom one the referee was fooled into awarding
// (resolveFoulPhantom below) — once a free kick has been given, converting
// it works exactly the same either way. Any team can attempt one — this
// used to require at least one freeKickSpecialist on the pitch, making it
// literally impossible otherwise (0% across 1000 simulated matches).
// pickFreeKickTaker always returns someone, weighted toward sharpshooter/
// freeKickSpecialist when present, so the attempt itself is never gated on
// having a specialist — only the conversion chance is, and steeply: an
// ordinary player taking a hopeful free kick should score one only rarely
// (FREE_KICK_GOAL_CHANCE_NO_SPECIALIST), while a real specialist converts
// at a much higher, intensity-scaled rate (FREE_KICK_GOAL_CHANCE).
function attemptFreeKick(fouledTeam, minute, score, rng, stats) {
  const events = [];
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

  const taker = pickFreeKickTaker(fouledTeam, rng);
  const intensity = getTraitIntensity(taker, 'freeKickSpecialist');
  const goalChance =
    intensity > 0
      ? TRAIT_WEIGHTS.FREE_KICK_GOAL_CHANCE *
        (1 + intensity * TRAIT_WEIGHTS.FREE_KICK_SPECIALIST_WEIGHT) *
        goalkeeperForwardBoost
      : TRAIT_WEIGHTS.FREE_KICK_GOAL_CHANCE_NO_SPECIALIST * goalkeeperForwardBoost;
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
      { player: taker.name },
      rng,
      {
        playerId: taker.id,
      },
    );
    events.push(...maybeSilenceCrowd(fouledTeam, tookTheLead, taker, minute, rng, stats));
  }

  return events;
}

// A `flopper` occasionally goes further than just drawing real fouls more
// often (pickFouledPlayer's weighting, plus FOUL.FLOPPER_OPPONENT_FOUL_WEIGHT
// raising the team's whole foul rate) — sometimes there was no contact at
// all, and the diver is trying to fool the referee outright. Three ways
// this can go, read as a 3-way split (FOUL.DIVE_CAUGHT_CARDED_CHANCE,
// FOUL.DIVE_CAUGHT_CHANCE, and whatever's left over for success):
// 1. Caught AND carded for simulation — the dive fails AND costs a yellow.
// 2. Caught, but let off with just a talking-to — no foul, no card either.
// 3. It works: FOUL_PHANTOM goes through exactly like before, a real free
//    kick from a foul that never happened. Unlike a real foul, nobody on
//    `opposingTeam` did anything wrong in any of these three outcomes, so
//    this never runs the injury/official-assault checks a real foul does —
//    those are about punishing the offender's real conduct, and there's no
//    real offender here, just a diver who may or may not get away with it.
export function resolveFoulPhantom(diveTeam, opposingTeam, minute, score, rng, stats) {
  const events = [];
  const diver = pickFlopper(diveTeam, rng);
  const context = { player: diver.name, team: diveTeam.config, opponent: opposingTeam.config };

  const outcome = rng.pickWeighted(
    ['carded', 'caught', 'succeeded'],
    [
      FOUL.DIVE_CAUGHT_CARDED_CHANCE,
      FOUL.DIVE_CAUGHT_CHANCE,
      1 - FOUL.DIVE_CAUGHT_CARDED_CHANCE - FOUL.DIVE_CAUGHT_CHANCE,
    ],
  );

  if (outcome === 'carded') {
    pushEvent(events, minute, EVENT_TYPES.DIVE_CAUGHT_CARDED, diveTeam.side, context, rng, {
      playerId: diver.id,
    });
    stats.divesCaughtCarded++;
    events.push(...issueYellowCard(diveTeam, diver, minute, rng, stats));
    return events;
  }

  if (outcome === 'caught') {
    pushEvent(events, minute, EVENT_TYPES.DIVE_CAUGHT, diveTeam.side, context, rng, {
      playerId: diver.id,
    });
    stats.divesCaught++;
    return events;
  }

  pushEvent(events, minute, EVENT_TYPES.FOUL_PHANTOM, diveTeam.side, context, rng);
  stats.foulsPhantom++;
  events.push(...attemptFreeKick(diveTeam, minute, score, rng, stats));
  return events;
}
