// Match event types and their Portuguese narration templates, split by
// category under ./templates/ — the engine's code is English, but the
// narration text is player-facing content for a Brazilian audience, so it
// stays in Portuguese (see CLAUDE.md "Motor de simulação" and "Tom dos
// eventos"). This file is the module's public surface: everything outside
// src/engine/narration/ imports from here, never from a ./templates/*.js
// file directly (mirrors the src/engine/index.js boundary rule — see
// DECISOES.md decision 12).

import { EVENT_TYPES } from './event-types.js';
import { TEMPLATES as STRUCTURE } from './templates/structure.js';
import { TEMPLATES as CHANCES } from './templates/chances.js';
import { TEMPLATES as GOALS } from './templates/goals.js';
import { TEMPLATES as PENALTIES } from './templates/penalties.js';
import { TEMPLATES as DISCIPLINE } from './templates/discipline.js';
import { TEMPLATES as UNUSUAL } from './templates/unusual.js';
import { TEMPLATES as PROVOCATION } from './templates/provocation.js';
import { TEMPLATES as STALLING } from './templates/stalling.js';
import { TEMPLATES as SHOOTOUT } from './templates/shootout.js';

export { EVENT_TYPES };

const TEMPLATES = {
  ...STRUCTURE,
  ...CHANCES,
  ...GOALS,
  ...PENALTIES,
  ...DISCIPLINE,
  ...UNUSUAL,
  ...PROVOCATION,
  ...STALLING,
  ...SHOOTOUT,
};

// Every event type that represents a scored goal (increments the score),
// regardless of how it happened — used by callers that need to update a
// scoreboard without hardcoding each style.
export const GOAL_EVENT_TYPES = new Set([
  EVENT_TYPES.GOAL,
  EVENT_TYPES.GOAL_ANOTHER,
  EVENT_TYPES.GOAL_INDIVIDUAL,
  EVENT_TYPES.GOAL_ASSISTED,
  EVENT_TYPES.GOAL_CORNER,
  EVENT_TYPES.GOAL_LONG_SHOT,
  EVENT_TYPES.GOAL_REFEREE_DEFLECTION,
  EVENT_TYPES.GOAL_HANDBALL,
  EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER,
  EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER,
  EVENT_TYPES.GOAL_PENALTY,
  EVENT_TYPES.FREE_KICK_GOAL,
]);

function fillTemplate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? '');
}

export function narrate(type, context, rng) {
  const options = TEMPLATES[type];
  if (!options) throw new Error(`Unknown event type: ${type}`);
  return fillTemplate(rng.pick(options), context);
}

// Read-only view of one event type's current template pool — for tooling
// (see scripts/generate-narration-variants.js) that needs to know what
// already exists before proposing more, not for anything the match engine
// itself uses (that's narrate(), above). Returns a copy, not the live
// array, so a caller can't accidentally mutate TEMPLATES through it.
export function templatesFor(type) {
  return [...(TEMPLATES[type] ?? [])];
}

// Same template-filling as narrate(), but for text that isn't in the shared
// TEMPLATES pool — e.g. a player's own bespoke special-event lines.
export function narrateCustom(templates, context, rng) {
  return fillTemplate(rng.pick(templates), context);
}
