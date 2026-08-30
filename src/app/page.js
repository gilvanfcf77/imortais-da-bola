'use client';

import { useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ClubScreen from './components/ClubScreen.jsx';
import SquadScreen from './components/SquadScreen.jsx';
import CupScreen from './components/CupScreen.jsx';
import MatchScreen from './components/MatchScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import CupOutcomeScreen from './components/CupOutcomeScreen.jsx';

// Forfeit outright beats the goal count — see the identical check in
// wonMatch (src/app/actions.js) and CupOutcomeScreen.jsx. Without this, a
// match decided by WO (see EVENT_TYPES.MATCH_ABANDONED) could route the
// player to the wrong next screen.
function wonMatch(matchData) {
  if (matchData.result.abandoned) return matchData.result.abandonedSide === 'away';
  return matchData.shootout
    ? matchData.shootout.winnerSide === 'home'
    : matchData.result.homeGoals > matchData.result.awayGoals;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [club, setClub] = useState(null);
  const [squad, setSquad] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [bracket, setBracket] = useState(null);
  const [matchData, setMatchData] = useState(null);
  // Every matchData the player has played this cup run, oldest first — used
  // for the cup-wide goals/assists leaderboard on CupOutcomeScreen (see
  // cupScorerLeaderboard/cupAssisterLeaderboard in matchStats.js). Reset on
  // restart.
  const [matchHistory, setMatchHistory] = useState([]);

  function restart() {
    setClub(null);
    setSquad(null);
    setRoundIndex(0);
    setBracket(null);
    setMatchData(null);
    setMatchHistory([]);
    setScreen('home');
  }

  if (screen === 'home') return <HomeScreen onStart={() => setScreen('club')} />;

  if (screen === 'club')
    return (
      <ClubScreen
        onSelect={(selected) => {
          setClub(selected);
          setScreen('squad');
        }}
      />
    );

  if (screen === 'squad')
    return (
      <SquadScreen
        club={club}
        onComplete={(finishedSquad) => {
          setSquad(finishedSquad);
          setScreen('cup');
        }}
      />
    );

  if (screen === 'cup')
    return (
      <CupScreen
        club={club}
        squad={squad}
        roundIndex={roundIndex}
        bracket={bracket}
        onBracketReady={setBracket}
        onMatchReady={(data) => {
          setMatchData(data);
          setScreen('match');
        }}
      />
    );

  if (screen === 'match')
    return (
      <MatchScreen
        matchData={matchData}
        onFinished={() => {
          setMatchHistory((prev) => [...prev, matchData]);
          setScreen('result');
        }}
      />
    );

  // Always shown right after a match, win or lose — the player sees that
  // match's full stats (including cards) before moving on, whether the next
  // stop is the next round or the cup outcome.
  if (screen === 'result')
    return (
      <ResultScreen
        matchData={matchData}
        onContinue={() => {
          const isLastRound = roundIndex === bracket.rounds.length - 1;
          if (!isLastRound && wonMatch(matchData)) {
            setRoundIndex(roundIndex + 1);
            setScreen('cup');
          } else {
            setScreen('champion');
          }
        }}
      />
    );

  return (
    <CupOutcomeScreen
      matchData={matchData}
      matchHistory={matchHistory}
      roundIndex={roundIndex}
      bracket={bracket}
      onRestart={restart}
    />
  );
}
