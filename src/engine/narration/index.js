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

// Portuguese contracts a preposition with the definite article that follows
// it (de+o="do", para+o="pro" informally, em+o="no"), and which contraction
// is correct depends on the specific club's grammatical gender — "do
// Corinthians" but "da Ponte Preta". A shared template pool that narrates
// every club can't hardcode that contraction, so a template that needs one
// uses a derived placeholder instead of writing the preposition itself: for
// any of {team}/{opponent}/{crowd}, {xOf} gives "do"/"da" + name, {xFor}
// gives "pro"/"pra" + name (the spoken contraction of "para o"/"para a",
// matching this project's spoken-not-written narration convention), {xIn}
// gives "no"/"na" + name, {xArticle} gives the bare article + name for
// subject/object position with no preposition at all (e.g. "o Corinthians
// venceu"), and {xArticleCap} is the same but capitalized, for the rare
// template where that subject/object position is also the start of a
// sentence (after a ". " or "! ") — {xArticle} itself always stays
// lowercase, so a genuinely sentence-initial case needs this instead of
// silently reading "o corinthians não acredita.". See CLAUDE.md club data:
// a club that needs the feminine article
// (Ponte Preta, Portuguesa) marks it with `feminineArticle: true`, read off
// here from whichever team config supplied {team}/{opponent}/{crowd} — the
// context value for those three keys is either a plain name string
// (masculine assumed) or a `{ name, feminineArticle }` object.
const CLUB_NOUN_KEYS = ['team', 'opponent', 'crowd'];
const CLUB_NOUN_SUFFIXES = {
  Of: ['do', 'da'],
  For: ['pro', 'pra'],
  In: ['no', 'na'],
  Article: ['o', 'a'],
};

function withClubPlaceholders(context) {
  const expanded = { ...context };
  for (const noun of CLUB_NOUN_KEYS) {
    const value = context[noun];
    if (value == null) continue;
    const isObject = typeof value === 'object';
    const name = isObject ? value.name : value;
    const feminine = isObject && Boolean(value.feminineArticle);
    expanded[noun] = name;
    for (const [suffix, [masculine, femForm]] of Object.entries(CLUB_NOUN_SUFFIXES)) {
      expanded[`${noun}${suffix}`] = `${feminine ? femForm : masculine} ${name}`;
    }
    const article = feminine ? 'a' : 'o';
    expanded[`${noun}ArticleCap`] = `${article.toUpperCase()} ${name}`;
  }
  return expanded;
}

function fillTemplate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? '');
}

export function narrate(type, context, rng) {
  const options = TEMPLATES[type];
  if (!options) throw new Error(`Unknown event type: ${type}`);
  return fillTemplate(rng.pick(options), withClubPlaceholders(context));
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
  return fillTemplate(rng.pick(templates), withClubPlaceholders(context));
}
