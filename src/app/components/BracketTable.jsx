'use client';

// Shows every round up to and including `upToRoundIndex` — later rounds stay
// hidden, since who the player would face there depends on results this
// screen hasn't revealed yet. Rounds before `upToRoundIndex` are already won
// by definition (you can't reach a later round otherwise) — shown as
// "venceu" without the exact score, since page.js doesn't keep a full match
// history across rounds, only the latest one. `lastRoundOutcome` (optional:
// 'won' | 'lost') labels the last shown round instead of leaving it blank,
// for the post-tournament recap on CupOutcomeScreen.
function opponentLabel(opponent) {
  return opponent.era ? `${opponent.name} (${opponent.era})` : opponent.name;
}

export default function BracketTable({
  rounds,
  upToRoundIndex,
  playerClubName,
  lastRoundOutcome = null,
}) {
  const visibleRounds = rounds.slice(0, upToRoundIndex + 1);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {visibleRounds.map((round, i) => {
        const isLastShown = i === upToRoundIndex;
        const playerStatus = !isLastShown
          ? 'venceu'
          : lastRoundOutcome === 'won'
            ? 'venceu'
            : lastRoundOutcome === 'lost'
              ? 'perdeu'
              : null;

        return (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {round.name}
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-2 font-semibold text-emerald-400">
                <span className="truncate">{playerClubName}</span>
                {playerStatus && (
                  <span className="shrink-0 text-xs font-normal text-slate-500">
                    {playerStatus}
                  </span>
                )}
                <span className="truncate text-right font-normal text-slate-300">
                  {opponentLabel(round.playerOpponent)}
                </span>
              </div>
              {round.otherMatches.map((match, j) => (
                <div key={j} className="flex items-center justify-between gap-2 text-slate-500">
                  <span className="truncate">{opponentLabel(match.home)}</span>
                  <span className="shrink-0 text-xs">{match.scoreLabel}</span>
                  <span className="truncate text-right">{opponentLabel(match.away)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
