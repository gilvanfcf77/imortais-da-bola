// Loads each club's data from its own folder and re-exports the same named
// bindings the old single-file src/data/sample-clubs.js used to export, so
// scripts/sample-match.js and scripts/calibration.js don't need to change
// anything beyond the import path. Uses fs.readFileSync + JSON.parse instead
// of `import ... with { type: 'json' }` because that import-attribute syntax
// isn't reliably supported across every Node version this project claims to
// support (package.json says >=18); plain fs works everywhere. The browser
// side (viewer.html) has its own small fetch()-based loader instead, since
// it can't use fs — see the comment there for why the two aren't shared.
//
// A club can have just one era file (the test/stress clubs — one snapshot,
// no historical depth needed) or several `<year>.json` files (e.g.
// Corinthians, São Paulo), one per era, each with its own, different
// players. Every era file listed for a club gets merged into one flat
// `pool`, with each player tagged with the `era` it came from — matching
// CLAUDE.md's "sorteio é uma consulta sobre todas as passagens elegíveis do
// clube, de qualquer época", not just one season's squad. Single-era clubs
// are still named `<year>.json`, not `roster.json`, so an opponent drawn
// from one of them still shows a year in the UI instead of no era at all.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { discoverClubs } from './discover.js';

// Resolved once, from this module's own URL — avoids constructing a `new
// URL(dynamicRelativePath, import.meta.url)` per file, which breaks under
// Turbopack (the resulting URL instance fails fileURLToPath's `instanceof
// URL` check there, even though it works fine under webpack).
const CLUBS_DIR = dirname(fileURLToPath(import.meta.url));

// Which clubs/eras exist is discovered from the filesystem (see discover.js)
// instead of hardcoded here — adding a club is purely a matter of adding a
// folder with era JSON files in it, no code change in this file needed.
const CLUBS = discoverClubs(CLUBS_DIR);

function loadClubFile(slug, file) {
  const path = join(CLUBS_DIR, slug, file);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadClub({ slug, files }) {
  const parts = files.map((file) => loadClubFile(slug, file));
  const pool = parts.flatMap((part) =>
    part.pool.map((player) => ({
      ...player,
      era: part.era ?? null,
      legendary: part.legendary ?? false,
    })),
  );
  return {
    slug: parts[0].slug,
    name: parts[0].name,
    // Optional per-club flag — "o" (masculine) is the default and covers
    // every real club curated so far; only a handful of Brazilian clubs
    // (Ponte Preta, Portuguesa) take "a" instead. See
    // src/engine/narration/index.js's withClubPlaceholders for where this
    // actually picks the right preposition contraction ("do"/"da",
    // "pro"/"pra", ...) in narration text.
    feminineArticle: parts[0].feminineArticle ?? false,
    pool,
  };
}

const bySlug = Object.fromEntries(CLUBS.map((club) => [club.slug, loadClub(club)]));

export const CORINTHIANS = bySlug['corinthians'];
export const SAO_PAULO = bySlug['sao-paulo'];
export const FLAMENGO = bySlug['flamengo'];
export const SAMANGOS_DO_VALE = bySlug['samangos-do-vale'];
export const CAPETAS_DA_SERRA = bySlug['capetas-da-serra'];
export const UNIAO_DA_PORRADA = bySlug['uniao-da-porrada'];
export const FERROLHO_DO_SERTAO = bySlug['ferrolho-do-sertao'];
export const OUSADIA_E_ALEGRIA = bySlug['ousadia-e-alegria'];
export const HEROIS_DE_PARIS = bySlug['herois-de-paris'];

export const SAMPLE_CLUBS = CLUBS.map((club) => bySlug[club.slug]);

// Club list for UI pickers, without the (possibly large) merged pool.
// `cupEligible` here means "has at least one era eligible as a cup
// opponent" — the flag itself lives per era (see getClubEras below), not on
// the club as a whole, since one era of a club can be curated enough to
// face players while another isn't.
export function getClubManifest() {
  return CLUBS.map(({ slug }) => ({
    slug,
    name: bySlug[slug].name,
    feminineArticle: bySlug[slug].feminineArticle,
    cupEligible: getClubEras(slug).some((e) => e.cupEligible),
  }));
}

// The full, already-merged multi-era pool for one club — every player from
// every era file, each still tagged with its own `era`. Used by the "draw the
// whole squad at once" shortcut, which is free to mix eras across positions
// in a single draw (see CLAUDE.md "sorteio é uma consulta").
export function getClubPool(slug) {
  return bySlug[slug].pool;
}

// Per-era pools for a club, unmerged — unlike the exports above, which flatten
// every era into one combined pool. Used by the squad-draft screen, which
// draws one era's roster at a time (see CLAUDE.md "sorteio").
export function getClubEras(slug) {
  const club = CLUBS.find((c) => c.slug === slug);
  return club.files.map((file) => {
    const part = loadClubFile(slug, file);
    return {
      era: part.era ?? null,
      legendary: part.legendary ?? false,
      // Stamped onto each player, same as loadClub's merged pool above —
      // without this, a player picked straight from here (SquadScreen's
      // manual pick / "Sortear" flow) never carries `.era`, unlike one
      // added via completeSquadRandomly (which goes through getClubPool /
      // loadClub instead). That gap was the actual bug: manually-picked
      // players silently missing the era badge next to their name in
      // LineupPanel, while randomly-completed ones had it.
      pool: part.pool.map((player) => ({ ...player, era: part.era ?? null })),
      cupEligible: part.cupEligible ?? false,
    };
  });
}
