'use server';

// Server-side glue between the UI and the engine. Runs in Node, so it can
// import src/data/clubs/index.js (fs-based) directly — no browser loader
// needed here, unlike viewer.html which has no server runtime of its own.
// Per DECISOES.md #12, only src/engine/index.js is imported, never internal
// engine files.

import {
  createRng,
  FORMATIONS,
  draftEleven,
  simulateMatch,
  resolvePenaltyShootout,
  defaultGamesmanship,
} from '../engine/index.js';
import { getClubManifest, getClubEras, getClubPool } from '../data/clubs/index.js';

export async function listClubs() {
  return getClubManifest();
}

export async function drawEraSquad(clubSlug) {
  const eras = getClubEras(clubSlug);
  const rng = createRng(Date.now());
  return rng.pick(eras);
}

// "Completar aleatoriamente" shortcut: keeps whatever the player already
// picked and drafts random players for the remaining open slots only, from
// the club's full multi-era pool (so the random fill can still mix eras
// across positions, same as scripts/sample-match.js does). Builds a
// synthetic formation with just the missing slot counts and reuses
// draftEleven as-is — no engine change needed.
export async function completeSquadRandomly(clubSlug, currentSquad) {
  const pickedIds = new Set(currentSquad.map((p) => p.id));
  const pool = getClubPool(clubSlug).filter((p) => !pickedIds.has(p.id));

  const filledByPosition = currentSquad.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] ?? 0) + 1;
    return acc;
  }, {});
  const remainingSlots = FORMATIONS['4-4-2'].slots
    .map((slot) => ({ position: slot.position, count: slot.count - (filledByPosition[slot.position] ?? 0) }))
    .filter((slot) => slot.count > 0);

  const rng = createRng(Date.now());
  const additions = draftEleven(pool, { slots: remainingSlots }, rng);
  return [...currentSquad, ...additions];
}

// Mirrors what the engine's own activePlayers() does internally (src/engine/
// match.js) — a player sent off during regulation can't take a shootout
// kick, and an injured one carries the same overall penalty for the rest of
// the game, shootout included.
function eligibleForShootout(lineup, sentOffIds, injuries) {
  const sentOff = new Set(sentOffIds);
  return lineup
    .filter((p) => !sentOff.has(p.id))
    .map((p) => (injuries[p.id] ? { ...p, overall: Math.max(1, p.overall - injuries[p.id]) } : p));
}

// Shared by playMatch (the player's own matches) and startCup (the other
// semifinal, simulated silently) — resolves a penalty shootout whenever
// regulation ends level, so a knockout match always has a winner.
function maybeResolveShootout(result, home, away, rng) {
  if (result.homeGoals !== result.awayGoals) return null;
  const shootoutHome = { ...home, lineup: eligibleForShootout(home.lineup, result.homeSentOffIds, result.homeInjuries) };
  const shootoutAway = { ...away, lineup: eligibleForShootout(away.lineup, result.awaySentOffIds, result.awayInjuries) };
  const lastMinute = result.events[result.events.length - 1].minute;
  return resolvePenaltyShootout({ home: shootoutHome, away: shootoutAway, rng, startMinute: lastMinute + 1 });
}

function wonMatch(result, shootout) {
  return shootout ? shootout.winnerSide === 'home' : result.homeGoals > result.awayGoals;
}

function matchScoreLabel(result, shootout) {
  return shootout
    ? `${shootout.homeScore}-${shootout.awayScore} nos pênaltis (${result.homeGoals}-${result.awayGoals} no tempo normal)`
    : `${result.homeGoals}-${result.awayGoals}`;
}

function toTeamConfig(participant) {
  return {
    name: participant.name,
    lineup: participant.lineup,
    posture: 'balanced',
    gamesmanship: defaultGamesmanship(participant.lineup),
  };
}

// Draws one club's single-era squad — never mixes eras within one opponent's
// lineup (CLAUDE.md: an NPC opponent is always "a real team from one
// specific year", unlike the player's own hand-picked, mixed-era squad).
function drawSingleEraOpponent(clubEntry, rng) {
  const era = rng.pick(getClubEras(clubEntry.slug));
  const lineup = draftEleven(era.pool, FORMATIONS['4-4-2'], rng);
  return { name: clubEntry.name, era: era.era, lineup };
}

// Plays a single already-determined match — the semifinal or the final,
// whichever the caller is currently on. Doesn't pick an opponent itself
// (see startCup for that) so it can be reused for either stage.
export async function playMatch({ homeName, squad, awayName, awayEra, awayLineup }) {
  const rng = createRng(Date.now());
  const home = { name: homeName, lineup: squad, posture: 'balanced', gamesmanship: defaultGamesmanship(squad) };
  const away = {
    name: awayName,
    lineup: awayLineup,
    posture: 'balanced',
    gamesmanship: defaultGamesmanship(awayLineup),
  };

  const result = simulateMatch({ home, away, rng });
  const shootout = maybeResolveShootout(result, home, away, rng);

  return { result, homeName, awayName, awayEra, homeLineup: squad, awayLineup, shootout };
}

// How many clubs total are in the cup, the player included. Bump this once
// enough other clubs exist — it needs TOURNAMENT_SIZE - 1 distinct others,
// and must stay a power of 2 (buildBracket below assumes it).
const TOURNAMENT_SIZE = 4;

const ROUND_NAME_SEQUENCE = ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final'];

// Named from the final backwards, so the last two rounds are always
// 'Semifinal'/'Final' regardless of how many rounds precede them.
function roundNamesFor(totalRounds) {
  const names = [];
  for (let i = 0; i < totalRounds; i++) {
    names.unshift(ROUND_NAME_SEQUENCE[i] ?? `Rodada ${totalRounds - i}`);
  }
  return names;
}

// Resolves a group of opponents (none of them the player) down to a single
// winner, simulating every match along the way. `list.length` must be a
// power of 2 — this is the recursive core that makes the whole bracket
// generic: the sub-tree that feeds the player's opponent at round r never
// contains the player, so it's always fully resolvable in advance, no
// matter how many rounds are left. Each produced match is tagged with
// `round` (0-indexed, matching its real position in the tournament — e.g. a
// group of 4 resolves its first two matches at round 0 and the decider at
// round 1), so the caller can slot them into the right round for display.
function resolveGroup(list, rng) {
  if (list.length === 1) return { winner: list[0], matches: [] };
  const mid = list.length / 2;
  const left = resolveGroup(list.slice(0, mid), rng);
  const right = resolveGroup(list.slice(mid), rng);
  const round = Math.log2(list.length) - 1;

  const home = toTeamConfig(left.winner);
  const away = toTeamConfig(right.winner);
  const result = simulateMatch({ home, away, rng });
  const shootout = maybeResolveShootout(result, home, away, rng);
  const winner = wonMatch(result, shootout) ? left.winner : right.winner;

  return {
    winner,
    matches: [
      ...left.matches,
      ...right.matches,
      {
        round,
        home: { name: left.winner.name, era: left.winner.era },
        away: { name: right.winner.name, era: right.winner.era },
        scoreLabel: matchScoreLabel(result, shootout),
        winnerName: winner.name,
      },
    ],
  };
}

// What would happen if the player got knocked out at `roundIndex`: the club
// that beat them keeps facing the (already-known) opponents lined up for
// the player in every later round, chained forward to the final. Computed
// once for every round but the last (losing the final already tells you
// the champion directly — no need for a hypothetical there).
function resolveChampionIfEliminatedAt(roundIndex, rounds, rng) {
  let candidate = rounds[roundIndex].playerOpponent;
  let runnerUp = null;
  const trail = [];

  for (let r = roundIndex + 1; r < rounds.length; r++) {
    const next = rounds[r].playerOpponent;
    const home = toTeamConfig(candidate);
    const away = toTeamConfig(next);
    const result = simulateMatch({ home, away, rng });
    const shootout = maybeResolveShootout(result, home, away, rng);
    trail.push(`${candidate.name} ${matchScoreLabel(result, shootout)} ${next.name}`);
    if (wonMatch(result, shootout)) {
      runnerUp = next;
    } else {
      runnerUp = candidate;
      candidate = next;
    }
  }

  return { championName: candidate.name, championEra: candidate.era, runnerUpName: runnerUp.name, runnerUpEra: runnerUp.era, trail };
}

// The sub-tree feeding the player's round-r opponent always has size 2^r
// (round 0: a single direct opponent; round 1: a 2-team group; round 2: a
// 4-team group; ...) — see resolveGroup's doc comment for why. Consumes
// `opponents` in those growing chunks, one per round.
function buildBracket(opponents, rng) {
  const totalRounds = Math.log2(opponents.length + 1);
  const names = roundNamesFor(totalRounds);
  const rounds = Array.from({ length: totalRounds }, (_, i) => ({ name: names[i], playerOpponent: null, otherMatches: [] }));

  let cursor = 0;
  for (let r = 0; r < totalRounds; r++) {
    const chunkSize = 2 ** r;
    const chunk = opponents.slice(cursor, cursor + chunkSize);
    cursor += chunkSize;
    const { winner, matches } = resolveGroup(chunk, rng);
    rounds[r].playerOpponent = winner;
    for (const match of matches) rounds[match.round].otherMatches.push(match);
  }

  for (let r = 0; r < totalRounds - 1; r++) {
    rounds[r].ifEliminatedHere = resolveChampionIfEliminatedAt(r, rounds, rng);
  }

  return rounds;
}

// Draws the whole bracket at once: TOURNAMENT_SIZE - 1 distinct clubs (never
// repeats one on both sides of the draw), each with its own single era, then
// resolves every match that doesn't involve the player.
export async function startCup(clubSlug, squad) {
  const manifest = getClubManifest();
  const others = manifest.filter((c) => c.slug !== clubSlug);
  const rng = createRng(Date.now());

  const opponentClubs = rng.shuffle(others).slice(0, TOURNAMENT_SIZE - 1);
  const opponents = opponentClubs.map((clubEntry) => drawSingleEraOpponent(clubEntry, rng));

  return { rounds: buildBracket(opponents, rng) };
}
