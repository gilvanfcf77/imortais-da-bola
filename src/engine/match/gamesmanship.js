// Catimba's flavor events (time-wasting, a slow throw-in/goal kick, milking
// a goal celebration) and the short-fuse-triggered banter that can escalate
// into a brawl (trash talk, a fight callout) — everything a team's
// gamesmanship level or a short-fused player can set off outside of an
// actual foul.

import { CARDS, GAMESMANSHIP, MATCH, COMEDY } from '../constants.js';
import { EVENT_TYPES } from '../narration/index.js';
import { activePlayers, scoreSituation } from './teamState.js';
import { pushEvent } from './events.js';
import { pickShortFuseInstigator, pickTauntVictim, pickGoalkeeper } from './playerPicking.js';
import { issueYellowCard, refereeLeniencyWeight } from './discipline.js';
import { triggerBrawl } from './foul.js';

export function resolveTrashTalk(team, opponent, minute, rng, stats) {
  const events = [];
  const instigator = pickShortFuseInstigator(team, rng);
  if (!instigator) return events;

  const target = pickTauntVictim(opponent, rng);
  pushEvent(
    events,
    minute,
    EVENT_TYPES.TRASH_TALK,
    team.side,
    { player: instigator.name, victim: target.name },
    rng,
  );
  stats.trashTalks++;

  return events;
}

export function resolveFightCallout(team, opponent, minute, rng, stats) {
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
    rng,
  );
  stats.fightCallouts++;

  if (rng.chance(COMEDY.BRAWL_CHANCE_AFTER_FIGHT_CALLOUT)) {
    events.push(...triggerBrawl(team, opponent, minute, target.name, rng, stats));
  }

  return events;
}

export function resolveTimeWasting(team, minute, rng) {
  const events = [];
  pushEvent(events, minute, EVENT_TYPES.TIME_WASTING, team.side, { team: team.config }, rng);
  return events;
}

// Delay-of-game card risk reuses the same yellow-chance shape as a foul
// (CARDS.BASE_YELLOW_CHANCE boosted by gamesmanship and referee leniency on
// an already-booked player), just without the shortFuse/scandalous
// multipliers that are specific to fouls.
export function delayOfGameCardChance(team, player, gamesmanshipLevel) {
  return (
    CARDS.BASE_YELLOW_CHANCE *
    (1 + gamesmanshipLevel * GAMESMANSHIP.CARD_RISK_PER_LEVEL) *
    refereeLeniencyWeight(team, player)
  );
}

export function resolveThrowInDelay(team, minute, gamesmanshipLevel, rng, stats) {
  const events = [];
  const active = activePlayers(team);
  if (active.length === 0) return events;

  // A throw-in is taken from the touchline, never by the goalkeeper — same
  // reasoning as resolveGoalKickDelay going the other way (always the
  // keeper, since that's their restart). Falls back to whoever's on the
  // pitch in the freak case a team is down to just its goalkeeper (e.g.
  // every outfield player sent off), rather than crashing on an empty pick.
  const outfield = active.filter((p) => p.position !== 'GK');
  const pool = outfield.length > 0 ? outfield : active;
  // Among outfield players, the fullback nearest the touchline takes it
  // far more often in practice than anyone else — see THROW_IN_TAKER_FB_WEIGHT.
  const weights = pool.map((p) =>
    p.position === 'FB' ? GAMESMANSHIP.THROW_IN_TAKER_FB_WEIGHT : 1,
  );
  const player = rng.pickWeighted(pool, weights);
  pushEvent(
    events,
    minute,
    EVENT_TYPES.THROW_IN_DELAY,
    team.side,
    { player: player.name, team: team.config },
    rng,
    {
      playerId: player.id,
    },
  );
  stats.throwInDelays++;

  if (rng.chance(delayOfGameCardChance(team, player, gamesmanshipLevel))) {
    events.push(...issueYellowCard(team, player, minute, rng, stats));
  }

  return events;
}

export function resolveGoalKickDelay(team, minute, gamesmanshipLevel, rng, stats) {
  const events = [];
  const keeper = pickGoalkeeper(team, rng);
  pushEvent(
    events,
    minute,
    EVENT_TYPES.GOAL_KICK_DELAY,
    team.side,
    { player: keeper.name, team: team.config },
    rng,
    {
      playerId: keeper.id,
    },
  );
  stats.goalKickDelays++;

  if (rng.chance(delayOfGameCardChance(team, keeper, gamesmanshipLevel))) {
    events.push(...issueYellowCard(team, keeper, minute, rng, stats));
  }

  return events;
}

// Milking the celebration itself to burn the clock — real Law 12 territory
// (delaying the restart of play is cardable), so it reuses the same
// delay-of-game card risk as a slow throw-in or goal kick. Any outfield
// player can be the one still celebrating, so no position weighting like
// resolveThrowInDelay's fullback bias.
export function resolveGoalCelebrationStall(team, minute, gamesmanshipLevel, rng, stats) {
  const events = [];
  const active = activePlayers(team);
  if (active.length === 0) return events;

  const player = rng.pick(active);
  pushEvent(
    events,
    minute,
    EVENT_TYPES.GOAL_CELEBRATION_STALL,
    team.side,
    { player: player.name, team: team.config },
    rng,
    { playerId: player.id },
  );
  stats.goalCelebrationStalls++;

  if (rng.chance(delayOfGameCardChance(team, player, gamesmanshipLevel))) {
    events.push(...issueYellowCard(team, player, minute, rng, stats));
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
export function resolveStoppageAnnouncement(
  homeTeam,
  awayTeam,
  minute,
  stoppage,
  range,
  score,
  rng,
  stats,
) {
  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.STOPPAGE_TIME_ANNOUNCED,
    null,
    { minutes: stoppage, team: homeTeam.config, opponent: awayTeam.config },
    rng,
  );

  const isLow = stoppage <= (range[0] + range[1]) / 2;
  const homeSituation = scoreSituation('home', score);
  const boosOverTooLittle = homeSituation !== 'winning' && isLow;
  const boosOverTooMuch = homeSituation === 'winning' && !isLow;

  if ((boosOverTooLittle || boosOverTooMuch) && rng.chance(MATCH.STOPPAGE_BOO_CHANCE)) {
    pushEvent(
      events,
      minute,
      boosOverTooLittle
        ? EVENT_TYPES.STOPPAGE_TIME_BOOED_SHORT
        : EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG,
      homeTeam.side,
      { crowd: homeTeam.config },
      rng,
    );
    stats.stoppageTimeBooed++;
  }

  return events;
}
