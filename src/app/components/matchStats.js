import { EVENT_TYPES, GOAL_EVENT_TYPES } from '../../engine/index.js';

// Every event type that represents an attempt at goal, scored or not — used
// to approximate a "shots" count per side. The engine itself has no such
// counter (see src/engine/match.js `stats`), so this is derived here from
// the event log rather than added as a new engine stat. DISALLOWED_GOAL is
// left out on purpose: it fires on the same shot a GOAL_EVENT_TYPES event
// already counted, so including it would double-count that attempt.
// Shootout kicks are deliberately excluded too — they aren't shots taken
// during play, they'd skew this toward whoever needed a shootout at all.
const SHOT_EVENT_TYPES = new Set([
  ...GOAL_EVENT_TYPES,
  EVENT_TYPES.WHIFF,
  EVENT_TYPES.CHANCE_MISSED,
  EVENT_TYPES.WALL_SAVE,
  EVENT_TYPES.GOAL_LINE_CLEARANCE,
  EVENT_TYPES.HANDBALL_ON_THE_LINE,
  EVENT_TYPES.PENALTY_MISSED,
]);

export function countShotsBySide(events) {
  const counts = { home: 0, away: 0 };
  for (const event of events) {
    if (event.side && SHOT_EVENT_TYPES.has(event.type)) counts[event.side]++;
  }
  return counts;
}

// The engine has no continuous "who has the ball" state — each minute, each
// side independently rolls its own chance to attack (see match.js
// simulateMinute), there's no shared, contested resource. This approximates
// possession as each side's share of attacking sequences (every SHOT_EVENT_TYPES
// event is the resolution of exactly one such sequence) — territorial/attacking
// dominance, not literal ball-control time. Verified via calibration that
// weaker squads do end up on the losing side of this split (see
// info/PROGRESSO.md).
export function possessionPctBySide(shots) {
  const total = shots.home + shots.away;
  if (total === 0) return { home: 50, away: 50 };
  return {
    home: Math.round((shots.home / total) * 100),
    away: Math.round((shots.away / total) * 100),
  };
}

// Tallies how many times `extractId` returns a truthy player id across
// events, and resolves whoever has the most to a name + which side they
// played on. Returns null if nobody qualifies (e.g. a 0-0 with no assists).
function topByTally(events, extractId, homeLineup, awayLineup) {
  const tally = {};
  for (const event of events) {
    const id = extractId(event);
    if (id) tally[id] = (tally[id] ?? 0) + 1;
  }
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;
  const [topId, count] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  const home = homeLineup.find((p) => p.id === topId);
  if (home) return { name: home.name, side: 'home', count };
  const away = awayLineup.find((p) => p.id === topId);
  if (away) return { name: away.name, side: 'away', count };
  return null;
}

export function topScorer(events, homeLineup, awayLineup) {
  return topByTally(events, (e) => (GOAL_EVENT_TYPES.has(e.type) ? e.playerId : null), homeLineup, awayLineup);
}

// Only GOAL_ASSISTED goals carry an assistPlayerId (see match.js resolveAttack)
// — penalties and direct free kicks have no assist concept in this model.
export function topAssister(events, homeLineup, awayLineup) {
  return topByTally(events, (e) => e.assistPlayerId ?? null, homeLineup, awayLineup);
}
