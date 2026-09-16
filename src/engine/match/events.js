// Thin wrappers around narrate/narrateCustom that every event-resolving
// function in match/ pushes through — kept as their own leaf module (no
// dependency on team state or anything else in match/) so every other
// module can import them without risking a circular import.

import { narrate, narrateCustom } from '../narration/index.js';

// `meta` carries structured references (player ids, card color...) a caller
// like the viewer needs to act on — e.g. highlighting a specific player in a
// lineup panel — without having to parse them back out of `description`.
export function pushEvent(events, minute, type, side, context, rng, meta) {
  events.push({ minute, type, side, description: narrate(type, context, rng), ...meta });
}

// For events whose text isn't in the shared TEMPLATES pool (currently just
// PLAYER_SPECIAL, narrated from that player's own templates).
export function pushCustomEvent(events, minute, type, side, templates, context, rng, meta) {
  events.push({ minute, type, side, description: narrateCustom(templates, context, rng), ...meta });
}
