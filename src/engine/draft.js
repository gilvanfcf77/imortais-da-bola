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
export function draftEleven(pool, formation, rng) {
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
        `Not enough players for role ${formationSlot.role} (${formationSlot.position}): none available`
      );
    }
    const chosen = rng.pick(candidates);
    lineup.push({ ...chosen, role: formationSlot.role, position: formationSlot.position });
    available = available.filter((p) => p.id !== chosen.id);
  }

  return lineup;
}
