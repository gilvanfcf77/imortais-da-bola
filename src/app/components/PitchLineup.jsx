import { overallColorClass } from './overallColor.js';
import { PITCH_COORDINATES } from './pitchCoordinates.js';

// Same idea as SquadScreen's own buildDisplaySlots (see LineupPanel there),
// but paired with this formation's hand-placed pitch coordinates instead of
// list order — see pitchCoordinates.js for why those aren't derived
// generically. `remaining` and the per-role coordinate arrays are both
// consumed left-to-right in formation.slots order, so two ZAG slots line up
// with ZAG's two coordinate entries in the same order.
function buildPitchSlots(formation, squad, formationName) {
  const remaining = [...squad];
  const coordsByRole = {};
  for (const [role, coords] of Object.entries(PITCH_COORDINATES[formationName] ?? {})) {
    coordsByRole[role] = [...coords];
  }
  return formation.slots.map((slot, index) => {
    const coord = coordsByRole[slot.role]?.shift() ?? { x: 50, y: 50 };
    const playerIndex = remaining.findIndex((p) => p.role === slot.role);
    const player = playerIndex === -1 ? null : remaining.splice(playerIndex, 1)[0];
    return { key: index, role: slot.role, player, x: coord.x, y: coord.y };
  });
}

// First name's initial + surname's initial (e.g. "Marcelinho Carioca" ->
// "MC") — short enough to fit inside a dot at pitch scale. Falls back to
// just the first two letters for a one-word name. Used only when the player
// has no curated `number` (see dotLabelFor below) — most fictional/test
// clubs don't have real shirt numbers to curate, so they keep initials.
function initialsFor(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// The shirt number curated for a real player (`number` on the pool entry).
// Every real, curated club (Corinthians, São Paulo, Flamengo) has this
// filled in for every player — a best-effort pick (classic Brazilian
// per-position numbering, or a documented-but-not-fully-certain number,
// e.g. one used in only one of several matches that season) when no single
// confidently-sourced number exists, since the user decided a plausible
// guess reads better in the UI than initials; see DECISOES.md decision 57.
// Still optional in the schema because fictional/stress-test clubs have no
// real-world number to curate at all, so they fall back to initials.
function dotLabelFor(player) {
  return player.number != null ? String(player.number) : initialsFor(player.name);
}

// Purely a second visualization of the exact same squad/selection state
// LineupPanel already renders as a list (see SquadScreen.jsx) — same
// `selection` object, same onSlotClick/onPlacedPlayerClick handlers, so
// picking or repositioning a player works identically from either one.
export default function PitchLineup({
  formation,
  formationName,
  squad,
  selection,
  swapTargets,
  onSlotClick,
  onPlacedPlayerClick,
}) {
  const slots = buildPitchSlots(formation, squad, formationName);
  return (
    <div className="mx-auto aspect-[2/3] w-full max-w-sm rounded-lg border border-emerald-950 bg-emerald-800 shadow-inner">
      <div className="relative h-full w-full">
        <svg
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <rect
            x="1"
            y="1"
            width="98"
            height="148"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          <line
            x1="1"
            y1="75"
            x2="99"
            y2="75"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          <circle
            cx="50"
            cy="75"
            r="12"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          <circle cx="50" cy="75" r="0.8" fill="white" fillOpacity="0.35" />
          {/* Opponent's goal, top */}
          <rect
            x="24"
            y="1"
            width="52"
            height="20"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          <rect
            x="38"
            y="1"
            width="24"
            height="8"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          {/* Own goal, bottom */}
          <rect
            x="24"
            y="128"
            width="52"
            height="20"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
          <rect
            x="38"
            y="140"
            width="24"
            height="8"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
        </svg>

        {slots.map((slot) => {
          const isTarget = !slot.player && Boolean(selection?.eligible.includes(slot.role));
          const isSwapTarget = Boolean(slot.player) && Boolean(swapTargets?.has(slot.player));
          const isSelected = Boolean(slot.player) && slot.player === selection?.player;
          const clickable = isTarget || Boolean(slot.player);

          return (
            <button
              key={slot.key}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (slot.player) onPlacedPlayerClick(slot.player);
                else if (isTarget) onSlotClick(slot.role);
              }}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${
                clickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold sm:h-9 sm:w-9 ${
                  slot.player
                    ? isSelected
                      ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                      : isSwapTarget
                        ? 'animate-pulse border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-emerald-300 bg-slate-900/90 text-slate-100'
                    : isTarget
                      ? 'animate-pulse border-dashed border-emerald-300 bg-emerald-400/20 text-emerald-100'
                      : 'border-dashed border-white/40 bg-white/5 text-white/50'
                }`}
              >
                {slot.player ? dotLabelFor(slot.player) : slot.role}
              </span>
              {slot.player && (
                <span className="max-w-[4.5rem] truncate rounded bg-slate-950/70 px-1 text-[9px] leading-tight text-slate-100 sm:max-w-[5.5rem]">
                  {slot.player.name}
                  <span className={`ml-1 font-semibold ${overallColorClass(slot.player.overall)}`}>
                    {slot.player.overall}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
