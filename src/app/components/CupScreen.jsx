'use client';

import { useEffect, useState } from 'react';
import { startCup, playMatch } from '../actions.js';
import BracketTable from './BracketTable.jsx';

// The bracket is drawn once (see startCup in src/app/actions.js) and lives
// in page.js state, not here — this screen gets re-mounted once per round,
// and re-drawing on a later visit would throw away the rest of the bracket
// startCup already determined.
export default function CupScreen({
  club,
  squad,
  posture,
  gamesmanship,
  roundIndex,
  bracket,
  onBracketReady,
  onMatchReady,
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bracket) {
      startCup(club.slug, squad).then(onBracketReady);
    }
  }, [bracket, club.slug, squad, onBracketReady]);

  const round = bracket?.rounds[roundIndex];
  const opponent = round?.playerOpponent;

  async function handlePlay() {
    setLoading(true);
    const matchData = await playMatch({
      homeName: club.name,
      homeFeminineArticle: club.feminineArticle,
      squad,
      posture,
      gamesmanship,
      awayName: opponent.name,
      awayFeminineArticle: opponent.feminineArticle,
      awayEra: opponent.era,
      awayLineup: opponent.lineup,
    });
    onMatchReady(matchData);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8">
      <h2 className="text-2xl font-bold">Copa Imortais da Bola</h2>
      {!round ? (
        <p className="text-slate-400">Sorteando o chaveamento...</p>
      ) : (
        <>
          <p className="text-slate-400">
            Fase: {round.name} — {club.name} x {opponent.name}
            {opponent.era ? ` (${opponent.era})` : ''}
          </p>
          <BracketTable
            rounds={bracket.rounds}
            upToRoundIndex={roundIndex}
            playerClubName={club.name}
          />
          <button
            onClick={handlePlay}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-8 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Preparando a partida...' : `Jogar a ${round.name.toLowerCase()}`}
          </button>
        </>
      )}
    </div>
  );
}
