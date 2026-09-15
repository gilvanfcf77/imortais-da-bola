// Drafts a starting eleven from a pool of eligible players, respecting a
// formation's slots. The draft never knows which club it's drafting for — it
// receives a pool and a formation (see CLAUDE.md "O sorteio é uma consulta").
//
// Each slot names a specific role (e.g. 'ZAG', 'VOL', 'PE' — see
// formations.js). A player is eligible for a slot if their own `roles`
// array contains that slot's role, so a player with roles from more than
// one broad position (e.g. a ZAG who's also a VOL) can be drafted into
// either kind of slot — never both in the same lineup, since a pick is
// removed from the pool for every later slot once taken. The player's
// `position` on the returned lineup entry reflects the slot they actually
// filled this time, not whatever their data file happens to list first —
// that's what lets every other engine mechanic (teamPower, GK checks, ...)
// keep reading `position` exactly as before with no changes of its own.
//
// `pickCandidate` decides, for one slot, who among the eligible candidates
// gets it — draftEleven and draftBestEleven below are just this loop with a
// different pickCandidate.
function draftWithPicker(pool, formation, rng, pickCandidate) {
  let available = [...pool];
  const lineup = [];

  for (const formationSlot of formation.slots) {
    let candidates = available.filter((p) => p.roles?.includes(formationSlot.role));
    // Falls back to anyone in the same broad position if that exact role
    // has nobody available (e.g. a club era with no dedicated VOL in the
    // pool) — a curated roster should always cover every role a formation
    // needs, but this keeps a coverage gap from hard-crashing the draft.
    if (candidates.length === 0) {
      candidates = available.filter((p) => p.position === formationSlot.position);
    }
    if (candidates.length === 0) {
      throw new Error(
        `Not enough players for role ${formationSlot.role} (${formationSlot.position}): none available`,
      );
    }
    const chosen = pickCandidate(candidates, rng);
    lineup.push({ ...chosen, role: formationSlot.role, position: formationSlot.position });
    // Compares by personId, not id, so the same real person can't be drafted
    // twice from two different era entries (id is per-passage; personId is
    // per-person — see CLAUDE.md/PROGRESSO.md on multi-era pools). Falls
    // back to id for data that has no personId (every fictional club's
    // pool), where each entry is already a distinct person.
    const chosenPersonId = chosen.personId ?? chosen.id;
    available = available.filter((p) => (p.personId ?? p.id) !== chosenPersonId);
  }

  return lineup;
}

// Genuinely random draft: every candidate eligible for a slot has an equal
// chance, regardless of overall. This is the "sorteio" the player's own
// squad is built from — CLAUDE.md's whole nostalgia pitch (a Corinthians
// draw that happens to pair Sócrates with a bit-part squad player) depends
// on it staying unweighted, and the user asked explicitly that the "complete
// automatically" button keep drafting real random players so the player's
// own team doesn't end up stacked.
export function draftEleven(pool, formation, rng) {
  return draftWithPicker(pool, formation, rng, (candidates) => rng.pick(candidates));
}

// Always-strongest draft: picks the single highest-overall eligible
// candidate for each slot (ties broken randomly, so equal-overall players
// aren't always resolved in data order). Used for the cup opponent's
// lineup — the opponent should always field that club's best possible XI,
// not a random one, so the player faces real max-strength opposition
// instead of getting lucky with a weak draw against them.
export function draftBestEleven(pool, formation, rng) {
  return draftWithPicker(pool, formation, rng, (candidates) => {
    const bestOverall = Math.max(...candidates.map((p) => p.overall));
    const best = candidates.filter((p) => p.overall === bestOverall);
    return rng.pick(best);
  });
}

// Picks whichever formation best fits this specific pool's strongest
// players, not a fixed default — e.g. a pool stacked with elite CAs but thin
// on the wing extracts more total overall from 4-2-4's two CA slots than
// from 4-3-3's CA/PE/PD/MAT shape. Tries draftBestEleven under every given
// formation and keeps the one whose best XI has the highest summed overall.
// Used for the cup opponent's lineup, alongside draftBestEleven itself —
// "força máxima" means both the players AND the shape that best fits them.
//
// Not every formation needs the same number of players per broad position
// (e.g. a back-three formation needs 3 ZAG-eligible players, one more than
// a back-four one) — a pool too thin for a given formation is skipped
// rather than crashing the whole search, since draftWithPicker throws when
// a slot has no eligible candidate at all.
export function draftBestFormationEleven(pool, formations, rng) {
  let best = null;
  for (const formation of Object.values(formations)) {
    let lineup;
    try {
      lineup = draftBestEleven(pool, formation, rng);
    } catch {
      continue;
    }
    const total = lineup.reduce((sum, p) => sum + p.overall, 0);
    if (!best || total > best.total) {
      best = { formation, lineup, total };
    }
  }
  if (!best) {
    throw new Error('No formation fits this pool: every formation left at least one slot empty');
  }
  return { formation: best.formation, lineup: best.lineup };
}
