'use client';

import { useMemo, useState } from 'react';
import { FORMATIONS, ROLE_TO_POSITION, defaultGamesmanship } from '../../engine/index.js';
import { drawEraSquad, completeSquadRandomly } from '../actions.js';

const POSTURE_LABELS = { attacking: 'ofensiva', balanced: 'equilibrada', defensive: 'defensiva' };
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
// purpose. `squad` entries are tagged with the specific `role` they were
// picked to fill (see handlePick/completeSquadRandomly/draftEleven), which
// is what lets two identically-labeled slots (e.g. two ZAG) each show their
// own occupant instead of both showing whoever was picked first.
function buildDisplaySlots(formation, squad) {
  const remaining = [...squad];
  return formation.slots.map((slot) => {
    const index = remaining.findIndex((p) => p.role === slot.role);
    if (index === -1) return { role: slot.role, player: null };
    const [player] = remaining.splice(index, 1);
    return { role: slot.role, player };
  });
}

function LineupPanel({ clubName, formation, squad }) {
  const rows = buildDisplaySlots(formation, squad);
  const averageOverall = squad.length
    ? (squad.reduce((sum, p) => sum + p.overall, 0) / squad.length).toFixed(1)
    : null;
  return (
    <aside className="w-full shrink-0 border-b border-slate-800 py-2 md:w-56 md:border-r md:border-b-0">
      <h3 className="px-3 pb-2 text-sm font-semibold text-slate-300">{clubName}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1">
        {rows.map((row, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 border-l-2 px-3 py-1.5 text-sm ${
              row.player ? 'border-emerald-500' : 'border-slate-800 text-slate-600'
            }`}
          >
            <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-500">{row.role}</span>
            <span className="flex-1 truncate">{row.player ? row.player.name : 'vaga aberta'}</span>
            {row.player && (
              <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-400">
                {row.player.overall}
              </span>
            )}
          </div>
        ))}
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
  // Set only when a clicked player is eligible for more than one still-open
  // role (e.g. a ZAG who's also a VOL, with both slots open) — the player
  // picks which one to fill; see handlePick/confirmRole below. Never set for
  // a player with exactly one eligible role, since there's nothing to choose.
  const [pendingChoice, setPendingChoice] = useState(null);

  // Changing formation mid-pick would leave already-picked players sitting
  // in slots that may no longer exist (e.g. dropping from 4-3-3's 3 FWs to
  // 4-4-2's 2) — simplest correct behavior is to start the squad over,
  // rather than trying to reconcile which picks still fit.
  function handleFormationChange(name) {
    setFormationName(name);
    setSquad([]);
    setDrawnEra(null);
    setPendingChoice(null);
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

  // Every role this specific player could still fill right now — a player
  // with roles ['ZAG', 'VOL'] only offers both if both kinds of slot are
  // still open; once the ZAG slots fill up, they'd only offer VOL.
  function eligibleRolesFor(player) {
    return (player.roles ?? [player.position]).filter((role) => openSlotsFor(role) > 0);
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
  function addToSquad(player, role) {
    setSquad([...squad, { ...player, role, position: ROLE_TO_POSITION[role] }]);
    setDrawnEra(null);
    setPendingChoice(null);
  }

  function handlePick(player) {
    if (pickedPersonIds.has(player.personId ?? player.id)) return;
    const eligible = eligibleRolesFor(player);
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
      addToSquad(player, eligible[0]);
    } else {
      setPendingChoice({ player, eligible });
    }
  }

  function handleStartCup() {
    const gamesmanship = gamesmanshipChoice === 'auto' ? defaultGamesmanship(squad) : Number(gamesmanshipChoice);
    onComplete(squad, posture, gamesmanship);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <LineupPanel clubName={club.name} formation={formation} squad={squad} />

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
          {squad.length > 0 && <span className="text-xs text-slate-500">(trava depois do 1º jogador escolhido)</span>}
        </label>

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
            disabled={loading || complete}
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

        {pendingChoice && (
          <div className="rounded-lg border border-emerald-500 bg-slate-900 px-4 py-3">
            <p className="mb-2 text-sm text-slate-300">
              Escalar <span className="font-semibold">{pendingChoice.player.name}</span> como:
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingChoice.eligible.map((role) => (
                <button
                  key={role}
                  onClick={() => addToSquad(pendingChoice.player, role)}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  {role}
                </button>
              ))}
              <button
                onClick={() => setPendingChoice(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {drawnEra && (
          <div>
            <p className="mb-3 text-sm text-slate-400">
              Elenco sorteado{drawnEra.era ? ` — ${drawnEra.era}` : ''}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {drawnEra.pool.map((player) => {
                const eligible = eligibleRolesFor(player);
                const selectable = eligible.length > 0 && !pickedPersonIds.has(player.personId ?? player.id);
                const traits = player.traits ?? [];
                return (
                  <button
                    key={player.id}
                    onClick={() => handlePick(player)}
                    disabled={!selectable}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      selectable
                        ? 'border-emerald-500 bg-slate-900 hover:bg-slate-800'
                        : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}
                  >
                    <p className="font-medium">
                      [{(player.roles ?? [player.position]).join('/')}] {player.name}
                    </p>
                    <p className="text-sm text-slate-400">Overall {player.overall}</p>
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
