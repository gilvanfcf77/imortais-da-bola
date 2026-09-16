// Cards and their fallout: sending a player off, issuing a yellow (with the
// same-player-twice-in-a-match upgrade to a second-yellow red baked in), the
// referee's leniency toward an already-booked player, the home-advantage
// bias on any discretionary call, and drawing a stand-in goalkeeper when a
// dismissal leaves a team with no keeper on the pitch.

import { CARDS, REFEREE } from '../constants.js';
import { EVENT_TYPES } from '../narration/index.js';
import { activePlayers } from './teamState.js';
import { pushEvent } from './events.js';

// If this dismissal leaves the team with no goalkeeper-position player on
// the pitch, an outfield player is immediately drawn to fill in — a real
// keeper being sent off doesn't leave the team playing with 10, it leaves
// them playing with a keeper who's never trained for the job. Re-triggers
// if that stand-in later gets sent off too, drawing a new one each time.
export function maybeAssignStandInGoalkeeper(team, minute, rng, stats) {
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
    { player: chosen.name, team: team.config },
    rng,
    { playerId: chosen.id },
  );
  return events;
}

export function sendOff(team, player, minute, rng, stats) {
  team.redCards.add(player.id);
  stats.redCards[team.side]++;
  return maybeAssignStandInGoalkeeper(team, minute, rng, stats);
}

// Shared by resolveFoul and any other situation (throw-in/goal-kick delay)
// that can end in a yellow — handles the "already has one" upgrade to a
// second-yellow red the same way everywhere.
export function issueYellowCard(team, player, minute, rng, stats) {
  const events = [];
  if (team.yellowCards.has(player.id)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.SECOND_YELLOW_RED,
      team.side,
      { player: player.name },
      rng,
      {
        playerId: player.id,
        cardType: 'red',
      },
    );
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
export function refereeLeniencyWeight(team, player) {
  return team.yellowCards.has(player.id) ? CARDS.LENIENCY_ON_BOOKED_PLAYER : 1;
}

// `benefitedSide` is whichever team comes out ahead if this particular
// discretionary call goes through (awarded a penalty, shown a card to the
// other side, had a goal disallowed against them) — see REFEREE.HOME_BIAS
// in constants.js. Multiplies that call's chance up when the benefited
// side is home, down when it's away, so a single constant swings both
// directions symmetrically.
export function refereeBiasMultiplier(benefitedSide) {
  return benefitedSide === 'home' ? REFEREE.HOME_BIAS : 1 / REFEREE.HOME_BIAS;
}
