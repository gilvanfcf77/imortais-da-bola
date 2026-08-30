'use client';

import { countShotsBySide, possessionPctBySide, topScorer, topAssister } from './matchStats.js';
import BracketTable from './BracketTable.jsx';

function StatRow({ label, home, away }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 py-2">
      <span className="text-right text-lg tabular-nums">{home}</span>
      <span className="text-center text-sm text-slate-400">{label}</span>
      <span className="text-left text-lg tabular-nums">{away}</span>
    </div>
  );
}

// The player is always `home` (see playMatch in src/app/actions.js). A draw
// can't happen anymore — playMatch resolves a shootout whenever regulation
// ends level, so there's always a winnerSide. `roundIndex` tells us which
// round this screen is reporting on: page.js only ever routes here on a
// loss that isn't in the last round (a non-final win goes back to CupScreen
// for the next round instead), so "not the last round" here can only mean
// elimination, never a title.
export default function CupOutcomeScreen({ matchData, roundIndex, bracket, onRestart }) {
  const { result, homeName, awayName, homeLineup, awayLineup, shootout } = matchData;
  const won = shootout ? shootout.winnerSide === 'home' : result.homeGoals > result.awayGoals;
  const isLastRound = roundIndex === bracket.rounds.length - 1;
  const eliminated = !isLastRound;

  const shots = countShotsBySide(result.events);
  const possession = possessionPctBySide(shots);
  const scorer = topScorer(result.events, homeLineup, awayLineup);
  const assister = topAssister(result.events, homeLineup, awayLineup);

  const title = eliminated ? `❌ Eliminado na ${bracket.rounds[roundIndex].name.toLowerCase()}` : won ? '🏆 Campeão!' : '🥈 Vice-campeão';
  const titleOutcome = eliminated ? bracket.rounds[roundIndex].ifEliminatedHere : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 py-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">Fase: {bracket.rounds[roundIndex].name}</p>
        <h2 className="text-4xl font-bold">{title}</h2>
        <p className="mt-2 text-lg text-slate-300">
          {homeName} {result.homeGoals} x {result.awayGoals} {awayName}
          {shootout && (
            <span className="text-slate-400">
              {' '}
              (pên. {shootout.homeScore}-{shootout.awayScore})
            </span>
          )}
        </p>
        {titleOutcome && (
          <p className="mt-3 text-sm text-slate-400">
            Campeão: {titleOutcome.championName}
            {titleOutcome.championEra ? ` (${titleOutcome.championEra})` : ''} — Vice: {titleOutcome.runnerUpName}
            {titleOutcome.runnerUpEra ? ` (${titleOutcome.runnerUpEra})` : ''}
            <br />({titleOutcome.trail.join(' · ')})
          </p>
        )}
      </div>

      {(scorer || assister) && (
        <p className="text-sm text-slate-400">
          {scorer && `⚽ Artilheiro: ${scorer.name} (${scorer.count})`}
          {scorer && assister && ' · '}
          {assister && `🎯 Líder de assistências: ${assister.name} (${assister.count})`}
        </p>
      )}

      <BracketTable
        rounds={bracket.rounds}
        upToRoundIndex={roundIndex}
        playerClubName={homeName}
        lastRoundOutcome={won ? 'won' : 'lost'}
      />

      <div className="w-full rounded-lg border border-slate-800 bg-slate-900 px-6 py-4">
        <p className="mb-2 text-center text-xs uppercase tracking-wide text-slate-500">
          Estatísticas gerais do campeonato
        </p>
        {/* Ainda mostra só a última partida jogada, não uma agregação de
            todas as rodadas disputadas. Falta virar uma agregação de
            verdade quando isso importar de fato. */}
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
        onClick={onRestart}
        className="rounded-lg bg-emerald-500 px-8 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Jogar de novo
      </button>
    </div>
  );
}
