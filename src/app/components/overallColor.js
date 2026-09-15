// Color-codes a player's overall by where it lands on this project's own
// overall scale (see CLAUDE.md "Sistema de overall"): most decent players
// sit between 65 and 78, a genuine standout starts around there, and only a
// legend in exceptional form clears 90. Plain text (no class) for anything
// below that range on purpose — color should flag what's notable, not every
// number.
export function overallColorClass(overall) {
  if (overall >= 90) return 'text-red-400';
  if (overall >= 78) return 'text-orange-400';
  if (overall >= 65) return 'text-emerald-400';
  return '';
}
