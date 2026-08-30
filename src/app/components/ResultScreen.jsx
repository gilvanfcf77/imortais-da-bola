'use client';

import { countShotsBySide, possessionPctBySide } from './matchStats.js';

function StatRow({ label, home, away }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 py-2">
      <span className="text-right text-lg tabular-nums">{home}</span>
      <span className="text-center text-sm text-slate-400">{label}</span>
      <span className="text-left text-lg tabular-nums">{away}</span>
    </div>
  );
}

export default function ResultScreen({ matchData, onContinue }) {
  const { result, homeName, awayName, awayEra } = matchData;
  const shots = countShotsBySide(result.events);
  const possession = possessionPctBySide(shots);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 py-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">Fim de jogo</p>
        <h2 className="text-3xl font-bold">
          {homeName} {result.homeGoals} x {result.awayGoals} {awayName}
          {awayEra ? ` (${awayEra})` : ''}
        </h2>
      </div>

      <div className="w-full rounded-lg border border-slate-800 bg-slate-900 px-6 py-4">
        <div className="grid grid-cols-3 gap-4 border-b border-slate-800 pb-2 text-sm font-semibold text-slate-300">
          <span className="truncate text-right">{homeName}</span>
          <span></span>
          <span className="truncate text-left">{awayName}</span>
        </div>
        <StatRow label="Posse de bola" home={`${possession.home}%`} away={`${possession.away}%`} />
        <StatRow label="Finalizações" home={shots.home} away={shots.away} />
        <StatRow label="Faltas" home={result.stats.foulsBySide.home} away={result.stats.foulsBySide.away} />
        <StatRow
          label="Cartões amarelos"
          home={result.stats.yellowCardsBySide.home}
          away={result.stats.yellowCardsBySide.away}
        />
        <StatRow
          label="Cartões vermelhos"
          home={result.stats.redCardsBySide.home}
          away={result.stats.redCardsBySide.away}
        />
      </div>

      <button
        onClick={onContinue}
        className="rounded-lg bg-emerald-500 px-8 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Continuar
      </button>
    </div>
  );
}
