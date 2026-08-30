'use client';

import { useMemo, useState } from 'react';
import { FORMATIONS } from '../../engine/index.js';
import { drawEraSquad, completeSquadRandomly } from '../actions.js';

const POSITION_LABELS = { GK: 'GOL', CB: 'ZAG', FB: 'LAT', MF: 'MEI', FW: 'ATA' };

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

// One row per slot in formation order (GK, CB, CB, FB, FB, ...), independent
// of the order players were actually picked in — picks can happen in any
// order now, so display order and pick order are decoupled on purpose.
function buildDisplaySlots(formation, squad) {
  const byPosition = new Map();
  for (const player of squad) {
    if (!byPosition.has(player.position)) byPosition.set(player.position, []);
    byPosition.get(player.position).push(player);
  }
  const rows = [];
  for (const slot of formation.slots) {
    const filled = byPosition.get(slot.position) ?? [];
    for (let i = 0; i < slot.count; i++) {
      rows.push({ position: slot.position, player: filled[i] ?? null });
    }
  }
  return rows;
}

function LineupPanel({ clubName, formation, squad }) {
  const rows = buildDisplaySlots(formation, squad);
  const averageOverall = squad.length
    ? (squad.reduce((sum, p) => sum + p.overall, 0) / squad.length).toFixed(1)
    : null;
  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 py-2">
      <h3 className="px-3 pb-2 text-sm font-semibold text-slate-300">{clubName}</h3>
      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 border-l-2 px-3 py-1.5 text-sm ${
            row.player ? 'border-emerald-500' : 'border-slate-800 text-slate-600'
          }`}
        >
          <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-500">
            {POSITION_LABELS[row.position]}
          </span>
          <span className="truncate">
            {row.player ? row.player.name : 'vaga aberta'}
            {row.player?.era ? ` '${String(row.player.era).slice(-2)}` : ''}
          </span>
        </div>
      ))}
      <p className="mt-3 border-t border-slate-800 px-3 pt-3 text-sm text-slate-400">
        Overall médio: <span className="font-semibold text-slate-200">{averageOverall ?? '—'}</span>
      </p>
    </aside>
  );
}

export default function SquadScreen({ club, onComplete }) {
  const formation = FORMATIONS['4-4-2'];
  const totalSlots = useMemo(() => formation.slots.reduce((sum, s) => sum + s.count, 0), [formation]);
  const [squad, setSquad] = useState([]);
  const [drawnEra, setDrawnEra] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickedIds = new Set(squad.map((p) => p.id));
  const totalByPosition = useMemo(() => {
    const counts = {};
    for (const slot of formation.slots) counts[slot.position] = slot.count;
    return counts;
  }, [formation]);
  const filledByPosition = squad.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] ?? 0) + 1;
    return acc;
  }, {});
  const complete = squad.length === totalSlots;

  function hasOpenSlot(position) {
    return (filledByPosition[position] ?? 0) < (totalByPosition[position] ?? 0);
  }

  async function handleDraw() {
    setLoading(true);
    const era = await drawEraSquad(club.slug);
    setDrawnEra(era);
    setLoading(false);
  }

  async function handleCompleteRandomly() {
    setLoading(true);
    const completedSquad = await completeSquadRandomly(club.slug, squad);
    setSquad(completedSquad);
    setDrawnEra(null);
    setLoading(false);
  }

  function handlePick(player) {
    if (!hasOpenSlot(player.position) || pickedIds.has(player.id)) return;
    setSquad([...squad, player]);
    setDrawnEra(null);
  }

  return (
    <div className="flex min-h-screen">
      <LineupPanel clubName={club.name} formation={formation} squad={squad} />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
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
          <button
            onClick={() => onComplete(squad)}
            className="w-fit rounded-lg bg-emerald-500 px-6 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Iniciar Copa
          </button>
        )}

        {drawnEra && (
          <div>
            <p className="mb-3 text-sm text-slate-400">
              Elenco sorteado{drawnEra.era ? ` — ${drawnEra.era}` : ''}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {drawnEra.pool.map((player) => {
                const selectable = hasOpenSlot(player.position) && !pickedIds.has(player.id);
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
                      [{POSITION_LABELS[player.position]}] {player.name}
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
