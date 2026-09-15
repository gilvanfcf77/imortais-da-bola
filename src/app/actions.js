'use server';

// Server-side glue between the UI and the engine. Runs in Node, so it can
// import src/data/clubs/index.js (fs-based) directly — no browser loader
// needed here, unlike viewer.html which has no server runtime of its own.
// Per DECISOES.md #12, only src/engine/index.js is imported, never internal
// engine files.

import {
  createRng,
  FORMATIONS,
  ROLE_TO_POSITION,
  draftEleven,
  draftBestFormationEleven,
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
// synthetic formation with just the still-open roles (by count, since a
// formation can list the same role more than once — e.g. two ZAG slots)
// and reuses draftEleven as-is — no engine change needed. `currentSquad`
// entries are tagged with `.role` (see SquadScreen.jsx and draftEleven),
// which is what lets this tell an open ZAG slot apart from an open VOL one.
export async function completeSquadRandomly(clubSlug, currentSquad, formationName = '4-4-2') {
  // Compares by personId (falling back to id), not just id, so a real
  // person already on the squad from one era can't also be drafted from a
  // different era's entry — see the personId note in draft.js.
  const pickedPersonIds = new Set(currentSquad.map((p) => p.personId ?? p.id));
  const pool = getClubPool(clubSlug).filter((p) => !pickedPersonIds.has(p.personId ?? p.id));

  const filledByRole = currentSquad.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});
  const totalByRole = FORMATIONS[formationName].slots.reduce((acc, slot) => {
    acc[slot.role] = (acc[slot.role] ?? 0) + 1;
    return acc;
  }, {});
  const remainingSlots = [];
  for (const [role, total] of Object.entries(totalByRole)) {
    const remaining = total - (filledByRole[role] ?? 0);
    for (let i = 0; i < remaining; i++)
      remainingSlots.push({ role, position: ROLE_TO_POSITION[role] });
  }

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
  // An abandoned match (see EVENT_TYPES.MATCH_ABANDONED) is already decided
  // by forfeit — never send it to penalties, even if the score happened to
  // be level at the moment the referee stopped play.
  if (result.abandoned || result.homeGoals !== result.awayGoals) return null;
  const shootoutHome = {
    ...home,
    lineup: eligibleForShootout(home.lineup, result.homeSentOffIds, result.homeInjuries),
  };
  const shootoutAway = {
    ...away,
    lineup: eligibleForShootout(away.lineup, result.awaySentOffIds, result.awayInjuries),
  };
  const lastMinute = result.events[result.events.length - 1].minute;
  return resolvePenaltyShootout({
    home: shootoutHome,
    away: shootoutAway,
    rng,
    startMinute: lastMinute + 1,
    homeStandInGoalkeeperId: result.homeStandInGoalkeeperId,
    awayStandInGoalkeeperId: result.awayStandInGoalkeeperId,
  });
}

function wonMatch(result, shootout) {
  // Forfeit outright beats the goal count — the side that dropped below 7
  // players lost regardless of what the score happened to be at that point.
  if (result.abandoned) return result.abandonedSide === 'away';
  return shootout ? shootout.winnerSide === 'home' : result.homeGoals > result.awayGoals;
}

function matchScoreLabel(result, shootout) {
  if (result.abandoned) return 'WO';
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
//
// Only draws from eras marked `legendary`: the cup should only ever pit the
// player against a club's most iconic squads, not every curated-but-ordinary
// season. This is separate from `cupEligible`, which gates whether the club
// takes part in the cup at all (see DECISOES.md #15) — `legendary` narrows
// that further to which of the club's eras can actually be the one drawn.
// The player's own squad-building screen (drawEraSquad, below) intentionally
// has no such filter — every era of the player's chosen club stays pickable
// there, legendary or not.
//
// Falls back to every era if none are legendary, so a cupEligible club that
// hasn't had an era curated as legendary yet still works as an opponent
// instead of crashing on an empty draw.
//
// Uses draftBestFormationEleven, not draftEleven: the opponent should always
// show up at that era's maximum strength — its actual best 11, AND in
// whichever formation best fits those specific players (a pool loaded with
// elite CAs but thin out wide gets more total quality from 4-2-4's two CA
// slots than from 4-3-3's PE/PD/MAT shape) — not a random subset of either.
// This is unlike the player's own squad, which the "complete automatically"
// button in SquadScreen.jsx fills with a genuinely random draftEleven draw
// under whatever formation the player picked (see completeSquadRandomly
// below) so the player's side doesn't end up artificially stacked either.
function drawSingleEraOpponent(clubEntry, rng) {
  const eras = getClubEras(clubEntry.slug);
  const legendaryEras = eras.filter((e) => e.legendary);
  const era = rng.pick(legendaryEras.length > 0 ? legendaryEras : eras);
  const { formation, lineup } = draftBestFormationEleven(era.pool, FORMATIONS, rng);
  return { name: clubEntry.name, era: era.era, formation: formation.name, lineup };
}

// Plays a single already-determined match — the semifinal or the final,
// whichever the caller is currently on. Doesn't pick an opponent itself
// (see startCup for that) so it can be reused for either stage.
export async function playMatch({
  homeName,
  squad,
  awayName,
  awayEra,
  awayLineup,
  posture = 'balanced',
  gamesmanship,
}) {
  const rng = createRng(Date.now());
  const home = {
    name: homeName,
    lineup: squad,
    posture,
    gamesmanship: gamesmanship ?? defaultGamesmanship(squad),
  };
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

// buildBracket needs the player's opponent count to be one less than a power
// of 2 (1, 3, 7, 15, ...) — see its own doc comment for why. Rather than a
// fixed TOURNAMENT_SIZE, this picks the largest such count that still fits
// within however many distinct cupEligible clubs are actually available, so
// the cup grows on its own as more real clubs get curated (see DECISOES.md
// #15) instead of needing a manual bump — and shrinks to a single Final when
// only one other club is eligible, instead of crashing.
function largestValidOpponentCount(availableOthers) {
  let count = 1;
  while (count <= availableOthers) count = count * 2 + 1;
  return (count - 1) / 2;
}

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
        // Carried so a true cup-wide leaderboard (see cupScorerLeaderboard/
        // cupAssisterLeaderboard in matchStats.js) can count goals/assists
        // from matches the player never plays too, not just their own —
        // this is the whole rest of the bracket, already simulated here.
        events: result.events,
        homeLineup: home.lineup,
        awayLineup: away.lineup,
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

  return {
    championName: candidate.name,
    championEra: candidate.era,
    runnerUpName: runnerUp.name,
    runnerUpEra: runnerUp.era,
    trail,
  };
}

// The sub-tree feeding the player's round-r opponent always has size 2^r
// (round 0: a single direct opponent; round 1: a 2-team group; round 2: a
// 4-team group; ...) — see resolveGroup's doc comment for why. Consumes
// `opponents` in those growing chunks, one per round.
function buildBracket(opponents, rng) {
  const totalRounds = Math.log2(opponents.length + 1);
  const names = roundNamesFor(totalRounds);
  const rounds = Array.from({ length: totalRounds }, (_, i) => ({
    name: names[i],
    playerOpponent: null,
    otherMatches: [],
  }));

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

// Draws the whole bracket at once: as many distinct clubs as
// largestValidOpponentCount allows (never repeats one on both sides of the
// draw), each with its own single era, then resolves every match that
// doesn't involve the player.
export async function startCup(clubSlug) {
  const manifest = getClubManifest();
  const others = manifest.filter((c) => c.slug !== clubSlug && c.cupEligible);
  const rng = createRng(Date.now());

  const opponentCount = largestValidOpponentCount(others.length);
  const opponentClubs = rng.shuffle(others).slice(0, opponentCount);
  const opponents = opponentClubs.map((clubEntry) => drawSingleEraOpponent(clubEntry, rng));

  return { rounds: buildBracket(opponents, rng) };
}
