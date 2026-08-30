// Drafts a starting eleven from a pool of eligible players, respecting a
// formation's slots. The draft never knows which club it's drafting for — it
// receives a pool and a formation (see CLAUDE.md "O sorteio é uma consulta").

export function draftEleven(pool, formation, rng) {
  const byPosition = new Map();
  for (const player of pool) {
    if (!byPosition.has(player.position)) byPosition.set(player.position, []);
    byPosition.get(player.position).push(player);
  }

  const lineup = [];
  for (const slot of formation.slots) {
    const candidates = byPosition.get(slot.position) ?? [];
    if (candidates.length < slot.count) {
      throw new Error(
        `Not enough players for position ${slot.position}: need ${slot.count}, have ${candidates.length}`
      );
    }
    const shuffled = rng.shuffle(candidates);
    lineup.push(...shuffled.slice(0, slot.count));
  }

  return lineup;
}
