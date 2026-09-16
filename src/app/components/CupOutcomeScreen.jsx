'use client';

import { cupScorerLeaderboard, cupAssisterLeaderboard } from './matchStats.js';
import BracketTable from './BracketTable.jsx';

// First three letters of the club name, uppercased (e.g. "Corinthians" ->
// "COR") — short enough to sit next to a name in a leaderboard row without
// needing a second line. Not unique in a mathematical sense (any two clubs
// that happen to share a first syllable would collide), but with this
// project's current small set of clubs it reads fine, and a leaderboard row
// still has the full name as a tooltip via `title` if it's ever ambiguous.
function clubTag(name) {
  return name.slice(0, 3).toUpperCase();
}

function Leaderboard({ title, entries, playerClubName }) {
  if (entries.length === 0) return null;
  // `entries` is already sorted descending (see tallyLeaderboard in
  // matchStats.js), so entries[0].count is the top tally — every entry that
  // matches it is a co-leader and gets the same 🥇 treatment, not just
  // whichever one happened to sort first among ties.
  const topCount = entries[0].count;
  return (
    <div className="w-full rounded-lg border border-slate-800 bg-slate-900 px-6 py-4">
      <p className="mb-2 text-center text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <ol className="space-y-1">
        {entries.map((entry, i) => {
          const isTopTied = entry.count === topCount;
          const isPlayerClub = entry.club === playerClubName;
          return (
            <li
              key={entry.id}
              className={
                isTopTied
                  ? 'flex items-center justify-between rounded bg-emerald-500/10 px-2 py-1 text-base font-bold text-emerald-400'
                  : 'flex items-center justify-between px-2 py-1 text-sm text-slate-300'
              }
            >
              <span className="truncate">
                {isTopTied ? '🥇' : `${i + 1}.`}{' '}
                {entry.club && (
                  <span className="text-xs text-slate-500" title={entry.club}>
                    {clubTag(entry.club)}
                  </span>
                )}{' '}
                <span className={isPlayerClub ? 'font-semibold text-sky-400' : undefined}>
                  {entry.name}
                </span>
              </span>
              <span className="tabular-nums">{entry.count}</span>
            </li>
          );
        })}
      </ol>
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
//
// Per-match stats (possession, shots, fouls, cards) live on ResultScreen now
// — page.js always shows that right after the match, before landing here —
// so this screen sticks to the outcome itself plus the cup-wide leaderboards.
export default function CupOutcomeScreen({
  matchData,
  matchHistory,
  roundIndex,
  bracket,
  onRestart,
}) {
  const { result, homeName, awayName, shootout } = matchData;
  // Forfeit outright beats the goal count — see wonMatch in src/app/actions.js.
  const won = result.abandoned
    ? result.abandonedSide === 'away'
    : shootout
      ? shootout.winnerSide === 'home'
      : result.homeGoals > result.awayGoals;
  const isLastRound = roundIndex === bracket.rounds.length - 1;
  const eliminated = !isLastRound;

  // A cup-wide leaderboard spans every match actually played in the
  // tournament, not just the player's own — matchHistory covers the
  // player's matches, and each round's otherMatches (set by resolveGroup in
  // actions.js) covers the rest of the bracket, already simulated up front
  // in startCup regardless of how far the player has gotten.
  const allMatches = [
    ...matchHistory.map((m) => ({
      events: m.result.events,
      homeName: m.homeName,
      awayName: m.awayName,
      homeLineup: m.homeLineup,
      awayLineup: m.awayLineup,
    })),
    // otherMatches (see resolveGroup in actions.js) already carries
    // home/away as `{ name, era }`, not a plain string — normalized to the
    // same `homeName`/`awayName` shape as matchHistory above so
    // buildPlayerInfoMap (matchStats.js) can read either kind uniformly.
    ...bracket.rounds.flatMap((r) =>
      r.otherMatches.map((m) => ({ ...m, homeName: m.home.name, awayName: m.away.name })),
    ),
  ];
  const scorers = cupScorerLeaderboard(allMatches);
  const assisters = cupAssisterLeaderboard(allMatches);

  const title = eliminated
    ? `❌ Eliminado na ${bracket.rounds[roundIndex].name.toLowerCase()}`
    : won
      ? '🏆 Campeão!'
      : '🥈 Vice-campeão';
  const titleOutcome = eliminated ? bracket.rounds[roundIndex].ifEliminatedHere : null;
  const lastRoundScoreLabel = shootout
    ? `${result.homeGoals}x${result.awayGoals} (pên. ${shootout.homeScore}-${shootout.awayScore})`
    : result.abandoned
      ? 'WO'
      : `${result.homeGoals}x${result.awayGoals}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 py-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Fase: {bracket.rounds[roundIndex].name}
        </p>
        <h2 className="text-4xl font-bold">{title}</h2>
        <p className="mt-2 text-lg text-slate-300">
          {homeName} {result.homeGoals} x {result.awayGoals} {awayName}
          {shootout && (
            <span className="text-slate-400">
              {' '}
              (pên. {shootout.homeScore}-{shootout.awayScore})
            </span>
          )}
          {result.abandoned && <span className="text-slate-400"> (WO)</span>}
        </p>
        {titleOutcome && (
          <p className="mt-3 text-sm text-slate-400">
            Campeão: {titleOutcome.championName}
            {titleOutcome.championEra ? ` (${titleOutcome.championEra})` : ''} — Vice:{' '}
            {titleOutcome.runnerUpName}
            {titleOutcome.runnerUpEra ? ` (${titleOutcome.runnerUpEra})` : ''}
            <br />({titleOutcome.trail.join(' · ')})
          </p>
        )}
      </div>

      <BracketTable
        rounds={bracket.rounds}
        upToRoundIndex={roundIndex}
        playerClubName={homeName}
        lastRoundOutcome={won ? 'won' : 'lost'}
        lastRoundScoreLabel={lastRoundScoreLabel}
      />

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <Leaderboard title="⚽ Artilheiros da copa" entries={scorers} playerClubName={homeName} />
        <Leaderboard
          title="🎯 Assistências da copa"
          entries={assisters}
          playerClubName={homeName}
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
