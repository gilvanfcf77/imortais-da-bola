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
  EVENT_TYPES.WHIFF_HOME_MISS,
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

// A real "artilheiro da copa" spans the whole competition, not just the
// player's own matches or their own squad — it needs every goal/assist from
// every match actually played in the tournament, including the parts of the
// bracket the player never sees (see `otherMatches` on each round, built by
// resolveGroup in actions.js). Each entry here is one match, normalized to
// `{ events, homeLineup, awayLineup }` regardless of whether it came from
// the player's own matchHistory (page.js) or a round's `otherMatches`.
function buildPlayerNameMap(matches) {
  const names = {};
  for (const m of matches) {
    for (const p of m.homeLineup) names[p.id] = p.name;
    for (const p of m.awayLineup) names[p.id] = p.name;
  }
  return names;
}

function tallyLeaderboard(matches, extractId, limit) {
  const tally = {};
  for (const m of matches) {
    for (const event of m.events) {
      const id = extractId(event);
      if (id) tally[id] = (tally[id] ?? 0) + 1;
    }
  }
  const names = buildPlayerNameMap(matches);
  return Object.entries(tally)
    .map(([id, count]) => ({ id, name: names[id] ?? '???', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function cupScorerLeaderboard(matches, limit = 10) {
  return tallyLeaderboard(
    matches,
    (e) => (GOAL_EVENT_TYPES.has(e.type) ? e.playerId : null),
    limit,
  );
}

// Only GOAL_ASSISTED and GOAL_CORNER goals carry an assistPlayerId (see
// match.js resolveAttack) — penalties and direct free kicks have no assist
// concept in this model.
export function cupAssisterLeaderboard(matches, limit = 10) {
  return tallyLeaderboard(matches, (e) => e.assistPlayerId ?? null, limit);
}
