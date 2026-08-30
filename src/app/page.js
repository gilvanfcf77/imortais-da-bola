'use client';

import { useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ClubScreen from './components/ClubScreen.jsx';
import SquadScreen from './components/SquadScreen.jsx';
import CupScreen from './components/CupScreen.jsx';
import MatchScreen from './components/MatchScreen.jsx';
import CupOutcomeScreen from './components/CupOutcomeScreen.jsx';

// ResultScreen.jsx (match-level stats + "Continuar") stays in the codebase
// unused for now — it only makes sense between legs of a real two-legged
// mata-mata (Passo 3 — each bracket round is still a single match), when the
// player's club is still alive and there's a next match to continue to.

function wonMatch(matchData) {
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

  function restart() {
    setClub(null);
    setSquad(null);
    setRoundIndex(0);
    setBracket(null);
    setMatchData(null);
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

  return <CupOutcomeScreen matchData={matchData} roundIndex={roundIndex} bracket={bracket} onRestart={restart} />;
}
