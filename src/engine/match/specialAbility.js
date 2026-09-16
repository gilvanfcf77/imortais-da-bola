// A player-specific special event (see `specialAbility` on a player in the
// club data): unlike traits, which are shared categories applied to any
// number of players, this is bespoke to one individual — their own trigger
// chance and their own narration.

import { ATTACK } from '../constants.js';
import { EVENT_TYPES } from '../narration/index.js';
import { clamp } from './teamState.js';
import { pushEvent, pushCustomEvent } from './events.js';

// When the ability also carries a `conversionMultiplier`, it's modeled as a
// bonus clear-chance attempt for that player right after the flavor event
// (e.g. Heróis de Paris' Talismã). `conversionMultiplier` is optional: an
// ability with none is pure flavor — e.g. Edílson's embaixadinhas (see
// `minLead` in the caller) showboat when the game is already comfortable,
// they don't manufacture a scoring chance out of it, so there's nothing to
// convert.
export function resolveSpecialAbility(team, player, minute, score, rng, stats) {
  const events = [];
  const ability = player.specialAbility;

  pushCustomEvent(
    events,
    minute,
    EVENT_TYPES.PLAYER_SPECIAL,
    team.side,
    ability.templates,
    { player: player.name, team: team.config },
    rng,
    { playerId: player.id },
  );
  stats.specialAbilities++;

  if (!ability.conversionMultiplier) return events;

  const conversionChance = clamp(
    ATTACK.CONVERSION_CLEAR_CHANCE * ability.conversionMultiplier,
    0,
    0.95,
  );
  if (rng.chance(conversionChance)) {
    if (team.side === 'home') score.home++;
    else score.away++;
    pushEvent(
      events,
      minute,
      EVENT_TYPES.GOAL,
      team.side,
      { player: player.name, team: team.config },
      rng,
      { playerId: player.id },
    );
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.CHANCE_MISSED,
      team.side,
      { player: player.name, team: team.config },
      rng,
    );
  }

  return events;
}
