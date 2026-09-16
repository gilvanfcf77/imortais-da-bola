// Static, deterministic checks over EVERY narration template already in the
// codebase — the shared TEMPLATES pools under src/engine/narration/
// templates/, plus every club era's per-player specialAbility.templates.
// Unlike scripts/generate-narration-variants.js (which only validates
// freshly-generated candidates before a human pastes them in), this script
// audits what's already committed, so it catches problems written by hand
// too, or ones that slipped through before this checklist existed.
//
// No API key, no network call — this only re-derives facts from the
// templates themselves (see checkUnknownPlaceholder below for why that's
// enough to catch real typos without a hardcoded placeholder list). For the
// tone/mechanic-match judgment that genuinely needs a human or an LLM (does
// this sentence sound like a spoken narrator, does it claim a mechanic the
// engine doesn't have), see the module doc comment in
// generate-narration-variants.js — that's a deliberately separate, offline,
// human-reviewed step, not something this script auto-approves.
//
// Usage:
//   node scripts/validate-narration.js
//   node scripts/validate-narration.js --quiet   (only print pools with problems)

import { EVENT_TYPES } from '../src/engine/narration/event-types.js';
import { TEMPLATES as STRUCTURE } from '../src/engine/narration/templates/structure.js';
import { TEMPLATES as CHANCES } from '../src/engine/narration/templates/chances.js';
import { TEMPLATES as GOALS } from '../src/engine/narration/templates/goals.js';
import { TEMPLATES as PENALTIES } from '../src/engine/narration/templates/penalties.js';
import { TEMPLATES as DISCIPLINE } from '../src/engine/narration/templates/discipline.js';
import { TEMPLATES as UNUSUAL } from '../src/engine/narration/templates/unusual.js';
import { TEMPLATES as PROVOCATION } from '../src/engine/narration/templates/provocation.js';
import { TEMPLATES as STALLING } from '../src/engine/narration/templates/stalling.js';
import { TEMPLATES as SHOOTOUT } from '../src/engine/narration/templates/shootout.js';
import { SAMPLE_CLUBS } from '../src/data/clubs/index.js';

const TEMPLATE_FILES = {
  STRUCTURE,
  CHANCES,
  GOALS,
  PENALTIES,
  DISCIPLINE,
  UNUSUAL,
  PROVOCATION,
  STALLING,
  SHOOTOUT,
};

// Reverse EVENT_TYPES (value -> name) so pools can be labeled by their
// readable constant name (e.g. "GOAL") instead of the raw string value.
const EVENT_TYPE_NAMES = Object.fromEntries(
  Object.entries(EVENT_TYPES).map(([name, value]) => [value, name]),
);

// Event types where an unqualified "a torcida..." is actually correct,
// because the event itself is only ever fired for the home side (see each
// event's own code comment in templates/*.js for why): CROWD_SILENCED is
// always an away player silencing the home crowd, WHIFF_HOME_MISS is always
// the home team's own player whiffing. Every other pool can fire for either
// team, so it must qualify which side's crowd it means (see
// narration-crowd-is-home-only) — the shared withClubPlaceholders()
// derivations ({crowdOf}, {teamOf}, "da casa", "do mandante", ...) are how a
// template does that qualification.
const ALWAYS_HOME_CROWD_EVENTS = new Set(['CROWD_SILENCED', 'WHIFF_HOME_MISS']);

const CROWD_WORDS = ['torcida', 'arquibancada', 'público', 'estádio vai', 'plateia'];
const QUALIFIED_CROWD_MARKERS = [
  'crowdof',
  'crowdfor',
  'crowdin',
  'crowdarticle',
  '{crowd}',
  'teamof',
  'teamfor',
  'teamin',
  'teamarticle',
  'da casa',
  'do mandante',
  'torcedor do mandante',
];
// "var" as a lowercase substring check would false-positive on ordinary
// Portuguese words that happen to contain those three letters ("covarde",
// "salvar", "levar", "advertência"...), so the acronym needs its own
// word-boundary regex against the ORIGINAL (not lowercased) text — VAR is
// always written as an uppercase acronym, never as the lowercase word "var".
const VAR_RE = /\bVAR\b/;
// NOT banned: bare "replay" — a template can say the TV replay shows
// something without implying the referee acted on it (no video review
// exists in this game; see no-var-referee-changes-mind). Only phrases that
// imply the review actually changed or is changing the call are banned.
const BANNED_PHRASES = ['revisão do lance', 'revê o lance', 'reveja o lance'];
const PLACEHOLDER_RE = /\{(\w+)\}/g;
const MAX_LENGTH = 160;

// team/opponent/crowd + Of/For/In/Article/ArticleCap are generated
// programmatically by withClubPlaceholders() in narration/index.js, not
// hand-typed — so a rarely-used one (e.g. {crowdArticle} appearing in only
// one template) is still legitimate, unlike a rare hand-typed name, which is
// far more likely a typo. Known upfront instead of inferred from frequency.
const CLUB_NOUN_KEYS = ['team', 'opponent', 'crowd'];
const CLUB_NOUN_SUFFIXES = ['Of', 'For', 'In', 'Article', 'ArticleCap'];
const KNOWN_DERIVED_PLACEHOLDERS = new Set(
  CLUB_NOUN_KEYS.flatMap((base) => CLUB_NOUN_SUFFIXES.map((suffix) => `${base}${suffix}`)),
);

function extractPlaceholders(template) {
  return new Set([...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1]));
}

function mentionsCrowd(template) {
  const lower = template.toLowerCase();
  return CROWD_WORDS.some((w) => lower.includes(w));
}

function mentionsUnqualifiedCrowd(template) {
  if (!mentionsCrowd(template)) return false;
  const lower = template.toLowerCase();
  return !QUALIFIED_CROWD_MARKERS.some((marker) => lower.includes(marker));
}

function mentionsBannedPhrase(template) {
  if (VAR_RE.test(template)) return 'VAR';
  const lower = template.toLowerCase();
  return BANNED_PHRASES.find((phrase) => lower.includes(phrase)) ?? null;
}

// Build every pool to check: one per shared EVENT_TYPES template array, plus
// one per real player's bespoke specialAbility.templates array. Each pool
// carries a human-readable label for the report.
function collectPools() {
  const pools = [];

  for (const templates of Object.values(TEMPLATE_FILES)) {
    for (const [eventValue, list] of Object.entries(templates)) {
      pools.push({ label: EVENT_TYPE_NAMES[eventValue] ?? eventValue, templates: list });
    }
  }

  for (const club of SAMPLE_CLUBS) {
    for (const player of club.pool) {
      if (!player.specialAbility?.templates) continue;
      pools.push({
        label: `${club.slug}/${player.era ?? '?'}/${player.name} (specialAbility)`,
        templates: player.specialAbility.templates,
      });
    }
  }

  return pools;
}

// A placeholder that shows up in only one template across the WHOLE corpus
// is suspicious without needing a hardcoded list of "valid" placeholder
// names: every real placeholder (team, teamOf, player, keeper, homeGoals...)
// is by construction used more than once somewhere, because templates are
// written a batch at a time reusing the same context shape. A name that
// appears exactly once is far more likely a typo (e.g. {teamm}, {playre})
// than a deliberate one-off, since narrate()'s fillTemplate() silently
// renders an unknown key as an empty string instead of throwing — a typo
// here doesn't crash, it just quietly prints a blank in production.
function buildPlaceholderCounts(pools) {
  const counts = new Map();
  for (const pool of pools) {
    for (const template of pool.templates) {
      for (const placeholder of extractPlaceholders(template)) {
        counts.set(placeholder, (counts.get(placeholder) ?? 0) + 1);
      }
    }
  }
  return counts;
}

function checkTemplate(template, pool, placeholderCounts) {
  const problems = [];

  for (const placeholder of extractPlaceholders(template)) {
    if (
      !KNOWN_DERIVED_PLACEHOLDERS.has(placeholder) &&
      (placeholderCounts.get(placeholder) ?? 0) <= 1
    ) {
      problems.push(
        `usa {${placeholder}}, que não aparece em nenhum outro template do projeto — possível erro de digitação (lembre-se: um placeholder desconhecido não quebra, só vira texto vazio)`,
      );
    }
  }

  if (mentionsUnqualifiedCrowd(template) && !ALWAYS_HOME_CROWD_EVENTS.has(pool.label)) {
    problems.push(
      'menciona torcida/arquibancada sem qualificar o lado (casa/fora) — o motor só modela a torcida do mandante (ver memória narration-crowd-is-home-only)',
    );
  }

  const banned = mentionsBannedPhrase(template);
  if (banned) {
    problems.push(
      `menciona "${banned}" — não existe revisão de vídeo no jogo, é sempre o árbitro mudando de ideia (ver memória no-var-referee-changes-mind)`,
    );
  }

  if (template.length > MAX_LENGTH) {
    problems.push(`longa (${template.length} caracteres) — pode não caber numa tela de celular`);
  }

  return problems;
}

function checkPool(pool, placeholderCounts) {
  const results = [];
  const seen = new Map();

  for (const template of pool.templates) {
    const problems = checkTemplate(template, pool, placeholderCounts);
    if (seen.has(template)) {
      problems.push(`duplicata exata de outro template no mesmo pool`);
    }
    seen.set(template, true);
    results.push({ template, problems });
  }

  return results;
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const pools = collectPools();
  const placeholderCounts = buildPlaceholderCounts(pools);

  let totalTemplates = 0;
  let totalProblems = 0;
  let poolsWithProblems = 0;

  for (const pool of pools) {
    const results = checkPool(pool, placeholderCounts);
    totalTemplates += results.length;
    const flagged = results.filter((r) => r.problems.length > 0);
    if (flagged.length === 0) {
      if (!quiet) console.log(`[OK] ${pool.label} (${results.length} templates)`);
      continue;
    }
    poolsWithProblems++;
    console.log(`\n[REVISAR] ${pool.label}`);
    for (const { template, problems } of flagged) {
      totalProblems += problems.length;
      console.log(`  "${template}"`);
      for (const p of problems) console.log(`    - ${p}`);
    }
  }

  console.log(
    `\n${pools.length} pools, ${totalTemplates} templates, ${poolsWithProblems} pools com achados, ${totalProblems} achados no total.`,
  );
}

main();
