'use client';

import { useMemo, useState } from 'react';
import { FORMATIONS, ROLE_TO_POSITION, defaultGamesmanship } from '../../engine/index.js';
import { drawEraSquad, completeSquadRandomly } from '../actions.js';
import { overallColorClass } from './overallColor.js';
import PitchLineup from './PitchLineup.jsx';

// Object.entries preserves this insertion order for the <select> options
// below — defensiva first, ofensiva last, per the user's request.
const POSTURE_LABELS = { defensive: 'defensiva', balanced: 'equilibrada', attacking: 'ofensiva' };
const FORMATION_NAMES = Object.keys(FORMATIONS);

// English slugs come straight from the engine (src/engine/traits.js) — this
// is the display-only Portuguese translation, matching the names already
// used in CLAUDE.md's trait table.
const TRAIT_LABELS = {
  freeKickSpecialist: 'Batedor de faltas',
  shortFuse: 'Pavio curto',
  cynicalFouler: 'Catimbeiro',
  sharpshooter: 'Artilheiro',
  playmaker: 'Garçom',
  wall: 'Muralha',
  dribbler: 'Driblador',
  leader: 'Líder',
};

// One row per slot in formation order (GOL, ZAG, ZAG, LE, LD, ...) — picks
// can happen in any order, so display order and pick order are decoupled on
// purpose. Matches each formation slot to a squad entry by its exact
// (role, roleSlot) pair — see formations.js's withRoleSlots — rather than
// just consuming "the next player with this role" in array order: the
// latter made the two ZAG slots indistinguishable from each other (there
// was nothing to tell "the first ZAG slot" apart from "the second" beyond
// which one happened to be scanned first), which is what broke moving a
// single ZAG occupant into the OTHER, still-open ZAG slot — nothing about
// the data actually changed, so nothing visibly moved (see DECISOES.md
// decision 60).
function buildDisplaySlots(formation, squad) {
  return formation.slots.map((slot) => {
    const player = squad.find((p) => p.role === slot.role && p.roleSlot === slot.roleSlot) ?? null;
    return { role: slot.role, roleSlot: slot.roleSlot, player };
  });
}

// `selection` (see SquadScreen's own `selection` state) drives which rows
// react to a click: a still-open slot lights up as a valid target when its
// role is in `selection.eligible` (whether that's a fresh pick from the
// pool or an already-placed player being repositioned — `onSlotClick`
// handles both the same way, see SquadScreen's handleSlotClick), an
// occupied row lights up as a swap target when it's in `swapTargets`
// (only possible during a reposition, never a fresh pick), and any
// already-filled row stays clickable on its own to let the player start
// (or cancel) a reposition, regardless of whether a selection is active.
function LineupPanel({
  clubName,
  formation,
  squad,
  selection,
  swapTargets,
  onSlotClick,
  onPlacedPlayerClick,
}) {
  const rows = buildDisplaySlots(formation, squad);
  const averageOverall = squad.length
    ? (squad.reduce((sum, p) => sum + p.overall, 0) / squad.length).toFixed(1)
    : null;
  return (
    <aside className="w-full shrink-0 border-b border-slate-800 py-2 md:w-56 md:border-r md:border-b-0">
      <h3 className="px-3 pb-2 text-sm font-semibold text-slate-300">{clubName}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1">
        {rows.map((row, index) => {
          const isTarget = !row.player && Boolean(selection?.eligible.includes(row.role));
          const isSwapTarget = Boolean(row.player) && Boolean(swapTargets?.has(row.player));
          const isSelected = Boolean(row.player) && row.player === selection?.player;
          const dimmed = Boolean(selection) && !row.player && !isTarget;
          const label = row.player
            ? row.player.name
            : isTarget
              ? 'clique para escalar aqui'
              : 'vaga aberta';
          const rowContent = (
            <>
              <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-500">
                {row.role}
              </span>
              <span className="flex-1 truncate">{label}</span>
              {row.player && (
                <span
                  className={`shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${overallColorClass(row.player.overall)}`}
                >
                  {row.player.overall}
                </span>
              )}
            </>
          );
          const baseClass =
            'flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left text-sm transition';

          if (isTarget) {
            return (
              <button
                key={index}
                onClick={() => onSlotClick(row.role, row.roleSlot)}
                className={`${baseClass} animate-pulse border-emerald-400 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
              >
                {rowContent}
              </button>
            );
          }
          if (row.player) {
            return (
              <button
                key={index}
                onClick={() => onPlacedPlayerClick(row.player)}
                className={`${baseClass} ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/10 text-sky-200'
                    : isSwapTarget
                      ? 'animate-pulse border-amber-400 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                      : 'border-emerald-500 hover:bg-slate-800/60'
                }`}
              >
                {rowContent}
              </button>
            );
          }
          return (
            <div
              key={index}
              className={`${baseClass} border-slate-800 text-slate-600 ${dimmed ? 'opacity-40' : ''}`}
            >
              {rowContent}
            </div>
          );
        })}
      </div>
      <p className="mt-3 border-t border-slate-800 px-3 pt-3 text-sm text-slate-400">
        Overall médio: <span className="font-semibold text-slate-200">{averageOverall ?? '—'}</span>
      </p>
    </aside>
  );
}

export default function SquadScreen({ club, onComplete }) {
  const [formationName, setFormationName] = useState('4-4-2');
  const formation = FORMATIONS[formationName];
  const totalSlots = formation.slots.length;
  const [squad, setSquad] = useState([]);
  const [drawnEra, setDrawnEra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posture, setPosture] = useState('balanced');
  // 'auto' resolves to defaultGamesmanship(squad) — same default the game
  // always used before this selector existed — right when the squad is
  // handed off, so a fixed number (not the sentinel) is what actually
  // reaches playMatch.
  const [gamesmanshipChoice, setGamesmanshipChoice] = useState('auto');
  // null, or { player, eligible, fromRole } — set once a clicked player has
  // more than one still-open role to choose from (e.g. a ZAG who's also a
  // VOL, with both slots open). `fromRole` is null for a fresh pick from the
  // drawn pool, or the role they currently occupy when repositioning an
  // already-placed player (see handlePick/handlePlacedPlayerClick below).
  // Drives which LineupPanel slots light up as valid click targets. Never
  // set when there's only one eligible role — nothing to choose, so that
  // case places the player immediately instead.
  const [selection, setSelection] = useState(null);

  // Changing formation mid-pick would leave already-picked players sitting
  // in slots that may no longer exist (e.g. dropping from 4-3-3's 3 FWs to
  // 4-4-2's 2) — simplest correct behavior is to start the squad over,
  // rather than trying to reconcile which picks still fit.
  function handleFormationChange(name) {
    setFormationName(name);
    setSquad([]);
    setDrawnEra(null);
    setSelection(null);
  }

  // Compares by personId (falling back to id) so a real person already
  // picked from one era's draw shows disabled if the same person turns up
  // in a different era — see the personId note in src/engine/draft.js.
  const pickedPersonIds = new Set(squad.map((p) => p.personId ?? p.id));
  const totalByRole = useMemo(() => {
    const counts = {};
    for (const slot of formation.slots) counts[slot.role] = (counts[slot.role] ?? 0) + 1;
    return counts;
  }, [formation]);
  const filledByRole = squad.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});
  const complete = squad.length === totalSlots;

  function openSlotsFor(role) {
    return (totalByRole[role] ?? 0) - (filledByRole[role] ?? 0);
  }

  // Every role this specific player could still move into via an EMPTY
  // slot right now — a player with roles ['ZAG', 'VOL'] only offers both if
  // both kinds of slot are still open; once the ZAG slots fill up, they'd
  // only offer VOL. Deliberately does NOT exclude the player's own current
  // role: when a role has more than one slot (e.g. two ZAG) and only one is
  // filled, an already-placed player in that role still needs to see the
  // OTHER open slot of the same role as a valid move — only the `!row.player`
  // check in LineupPanel/PitchLineup's isTarget stops them from ever being
  // offered their own (occupied) slot back. Used both for a fresh pick from
  // the drawn pool (handlePick) and for repositioning an already-placed one
  // (handlePlacedPlayerClick) — swapping into an OCCUPIED slot instead is a
  // separate concern, see swapTargetsFor below.
  function eligibleRolesFor(player) {
    return (player.roles ?? [player.position]).filter((role) => openSlotsFor(role) > 0);
  }

  // Other squad members `player` could trade places with: someone in a role
  // `player` is eligible for, who is themselves eligible for `player`'s
  // current role (`fromRole`) — a swap only makes sense if it's a legal
  // placement in both directions at once. Same reasoning as
  // eligibleRolesFor above applies to not excluding `fromRole` from the
  // candidate roles — a same-role swap between two ZAG entries is exactly
  // the main case this exists for. A ZAG/VOL swapping into a pure VOL slot
  // only works if that VOL player also happens to cover ZAG.
  function swapTargetsFor(player, fromRole) {
    const candidateRoles = new Set(player.roles ?? [player.position]);
    return squad.filter(
      (other) =>
        other !== player &&
        candidateRoles.has(other.role) &&
        (other.roles ?? [other.position]).includes(fromRole),
    );
  }

  async function handleDraw() {
    setLoading(true);
    const era = await drawEraSquad(club.slug);
    setDrawnEra(era);
    setLoading(false);
  }

  async function handleCompleteRandomly() {
    setLoading(true);
    const completedSquad = await completeSquadRandomly(club.slug, squad, formationName);
    setSquad(completedSquad);
    setDrawnEra(null);
    setLoading(false);
  }

  // `position` is overridden to match the slot actually filled (not
  // whatever the player's data file lists as their default) — same rule
  // draftEleven follows, so a ZAG picked into a VOL slot counts as MF for
  // the rest of the game exactly like one drafted that way automatically.
  // `roleSlot` addresses the exact slot instance within that role (see
  // formations.js's withRoleSlots) — required so buildDisplaySlots/
  // buildPitchSlots can tell this player's slot apart from any other one
  // sharing the same role.
  function addToSquad(player, role, roleSlot) {
    setSquad([...squad, { ...player, role, roleSlot, position: ROLE_TO_POSITION[role] }]);
    setDrawnEra(null);
    setSelection(null);
  }

  // Moves an already-placed player to a different slot they're also
  // eligible for, in place — same position-override rule as addToSquad,
  // just updating the existing squad entry instead of appending a new one.
  // Matches by reference, not personId: `player` here is always the exact
  // object handed back from LineupPanel's own squad array (see
  // handlePlacedPlayerClick), so this can't accidentally touch a different
  // era-entry for the same real person.
  function repositionInSquad(player, role, roleSlot) {
    setSquad(
      squad.map((p) =>
        p === player ? { ...p, role, roleSlot, position: ROLE_TO_POSITION[role] } : p,
      ),
    );
    setSelection(null);
  }

  // Trades two already-placed players' slots — e.g. the two ZAG entries, or
  // a ZAG moving into an occupied LE/LD spot while its occupant takes the
  // vacated ZAG spot. Only ever called with a pair swapTargetsFor already
  // vetted as mutually legal, so no further validation needed here. Swaps
  // the full (role, roleSlot) pair each player carries — not just `role` —
  // since two players who already share the exact same role (e.g. two ZAG)
  // would otherwise swap identical role strings and go nowhere; roleSlot is
  // what actually addresses "which ZAG slot," so swapping it is what makes
  // the two visibly trade places (left dot vs. right dot — see
  // pitchCoordinates.js and formations.js's withRoleSlots).
  function swapInSquad(playerA, playerB) {
    const { role: roleA, roleSlot: roleSlotA } = playerA;
    const { role: roleB, roleSlot: roleSlotB } = playerB;
    setSquad(
      squad.map((p) => {
        if (p === playerA)
          return { ...p, role: roleB, roleSlot: roleSlotB, position: ROLE_TO_POSITION[roleB] };
        if (p === playerB)
          return { ...p, role: roleA, roleSlot: roleSlotA, position: ROLE_TO_POSITION[roleA] };
        return p;
      }),
    );
    setSelection(null);
  }

  // Always opens a selection rather than auto-placing even a single-role
  // player straight into their only eligible slot (e.g. a goalkeeper, who
  // only ever has one role and — in most formations — only one slot to
  // begin with) — the user asked for placement to always be an explicit,
  // cancelable choice (click the empty slot to confirm, or the player's
  // own card again to back out), never an implicit side effect of picking
  // the card, no matter how few eligible slots there are.
  function handlePick(player) {
    if (selection?.player === player) {
      setSelection(null);
      return;
    }
    if (pickedPersonIds.has(player.personId ?? player.id)) return;
    const eligible = eligibleRolesFor(player);
    if (eligible.length === 0) return;
    setSelection({ player, eligible, fromRole: null });
  }

  // Clicking an already-placed player starts (or, clicked a second time,
  // cancels) a reposition: every other role they're also eligible for lights
  // up in the LineupPanel/PitchLineup for the next click to land on — an
  // open slot places them directly, an occupied one (if its occupant can
  // reciprocally take this player's current role) swaps the two. If a
  // reposition is already active and the newly-clicked player is a valid
  // swap partner for it, swap immediately instead of restarting the
  // selection on them. A player with nowhere else to go at all (no open
  // slot and no swap partner — genuinely nothing to choose between, unlike
  // handlePick, which always opens a selection even for a single eligible
  // slot) just does nothing.
  function handlePlacedPlayerClick(player) {
    if (selection?.player === player) {
      setSelection(null);
      return;
    }
    if (
      selection?.fromRole &&
      swapTargetsFor(selection.player, selection.fromRole).includes(player)
    ) {
      swapInSquad(selection.player, player);
      return;
    }
    const eligible = eligibleRolesFor(player);
    if (eligible.length === 0 && swapTargetsFor(player, player.role).length === 0) return;
    setSelection({ player, eligible, fromRole: player.role });
  }

  // Only ever called for a role in the active selection's own `eligible`
  // list (see LineupPanel's isTarget check), so no further validation
  // needed here — just route to whichever placement means for this
  // selection's origin. `roleSlot` comes straight from the specific empty
  // row/dot that was clicked (see buildDisplaySlots/buildPitchSlots), so
  // this always addresses the exact slot instance the player clicked, not
  // just "some open slot of this role."
  function handleSlotClick(role, roleSlot) {
    if (!selection) return;
    if (selection.fromRole) {
      repositionInSquad(selection.player, role, roleSlot);
    } else {
      addToSquad(selection.player, role, roleSlot);
    }
  }

  function handleStartCup() {
    const gamesmanship =
      gamesmanshipChoice === 'auto' ? defaultGamesmanship(squad) : Number(gamesmanshipChoice);
    onComplete(squad, posture, gamesmanship);
  }

  // For LineupPanel/PitchLineup to highlight which occupied slots the
  // active reposition selection could swap into, alongside the open ones
  // `selection.eligible` already covers.
  const swapTargets = selection?.fromRole
    ? new Set(swapTargetsFor(selection.player, selection.fromRole))
    : null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <LineupPanel
        clubName={club.name}
        formation={formation}
        squad={squad}
        selection={selection}
        swapTargets={swapTargets}
        onSlotClick={handleSlotClick}
        onPlacedPlayerClick={handlePlacedPlayerClick}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-8">
        <label className="flex w-fit items-center gap-2 text-sm text-slate-400">
          Formação
          <select
            value={formationName}
            onChange={(e) => handleFormationChange(e.target.value)}
            disabled={squad.length > 0}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 disabled:opacity-50"
          >
            {FORMATION_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {squad.length > 0 && (
            <span className="text-xs text-slate-500">(trava depois do 1º jogador escolhido)</span>
          )}
        </label>

        <PitchLineup
          formation={formation}
          formationName={formationName}
          squad={squad}
          selection={selection}
          swapTargets={swapTargets}
          onSlotClick={handleSlotClick}
          onPlacedPlayerClick={handlePlacedPlayerClick}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDraw}
            disabled={loading || complete}
            className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? 'Sorteando...' : 'Sortear'}
          </button>
          <button
            onClick={handleCompleteRandomly}
            // Locks only while a drawn pool (drawnEra) is sitting on screen
            // undecided — that's the window where clicking this would let
            // the player discard a "Sortear" pool they didn't like for a
            // completely fresh random one instead of actually committing to
            // it. Once they've picked from that pool (addToSquad resets
            // drawnEra to null), it unlocks again — squad.length > 0 alone
            // doesn't keep it locked, since picking IS committing.
            disabled={loading || complete || drawnEra !== null}
            className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
          >
            Completar aleatoriamente
          </button>
        </div>

        {complete && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Postura
              <select
                value={posture}
                onChange={(e) => setPosture(e.target.value)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                {Object.entries(POSTURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Catimba
              <select
                value={gamesmanshipChoice}
                onChange={(e) => setGamesmanshipChoice(e.target.value)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                <option value="auto">automática</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
          </div>
        )}

        {complete && (
          <button
            onClick={handleStartCup}
            className="w-fit rounded-lg bg-emerald-500 px-6 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Iniciar Copa
          </button>
        )}

        {selection && (
          <div className="rounded-lg border border-emerald-500 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {selection.fromRole ? (
              <>
                Movendo <span className="font-semibold">{selection.player.name}</span>
              </>
            ) : (
              <>
                Escalando <span className="font-semibold">{selection.player.name}</span>
              </>
            )}
          </div>
        )}

        {drawnEra && (
          <div>
            <p className="mb-3 text-sm text-slate-400">
              Elenco sorteado{drawnEra.era ? ` — ${drawnEra.era}` : ''}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {drawnEra.pool.map((player) => {
                const isSelected = selection?.player === player;
                const eligible = eligibleRolesFor(player);
                const selectable =
                  isSelected ||
                  (eligible.length > 0 && !pickedPersonIds.has(player.personId ?? player.id));
                const traits = player.traits ?? [];
                return (
                  <button
                    key={player.id}
                    onClick={() => handlePick(player)}
                    disabled={!selectable}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/10'
                        : selectable
                          ? 'border-emerald-500 bg-slate-900 hover:bg-slate-800'
                          : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}
                  >
                    <p className="font-medium">
                      [{(player.roles ?? [player.position]).join('/')}] {player.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      Overall{' '}
                      <span className={`font-semibold ${overallColorClass(player.overall)}`}>
                        {player.overall}
                      </span>
                    </p>
                    {traits.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {traits.map((t) => (
                          <span
                            key={t.slug}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                          >
                            {TRAIT_LABELS[t.slug] ?? t.slug} {t.intensity}
                          </span>
                        ))}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
