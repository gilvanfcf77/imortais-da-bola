'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENT_TYPES, GOAL_EVENT_TYPES } from '../../engine/index.js';

const SPEEDS = [
  { label: 'lenta', msPerMinute: 600 },
  { label: 'normal', msPerMinute: 300 },
  { label: 'rápida', msPerMinute: 120 },
];

const POSITION_LABELS = { GK: 'GOL', CB: 'ZAG', FB: 'LAT', MF: 'MEI', FW: 'ATA' };

const BADGE_STYLE = {
  goal: 'bg-transparent',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  injury: 'rounded-full bg-red-600 font-bold text-white',
};

// Referee-whistle moments: the foul itself (not its card, if any — that gets
// its own emoji below) and the three points in the match where the ref
// actually blows the whistle (kickoff, half-time, full-time). There's no
// dedicated whistle character in Unicode, so this uses 📣 as a stand-in.
const WHISTLE_EVENT_TYPES = new Set([
  EVENT_TYPES.FOUL,
  EVENT_TYPES.SCANDALOUS_FOUL,
  EVENT_TYPES.KICKOFF,
  EVENT_TYPES.HALFTIME,
  EVENT_TYPES.FULLTIME,
]);

// Tense/dramatic moments: the penalty situation itself (not the resulting
// goal, which already gets its own ⚽ — see GOAL_EVENT_TYPES) and a brawl
// breaking out. The individual cards handed out during a brawl keep their
// own 🟨/🟥 instead of this, since cardType already takes priority below.
const ALERT_EVENT_TYPES = new Set([
  EVENT_TYPES.PENALTY_AWARDED,
  EVENT_TYPES.PENALTY_NOT_GIVEN,
  EVENT_TYPES.PENALTY_PHANTOM,
  EVENT_TYPES.PENALTY_WRONG_LOCATION,
  EVENT_TYPES.PENALTY_MIND_GAMES,
  EVENT_TYPES.PENALTY_MISSED,
  EVENT_TYPES.BRAWL,
  // A deliberate handball to stop a goal on the line — rare enough (and
  // dramatic enough, since it can turn into a penalty) to deserve the same
  // "something's about to happen" flag as a penalty situation. Not
  // GOAL_LINE_CLEARANCE — that's the legal, everyday version of this save.
  EVENT_TYPES.HANDBALL_ON_THE_LINE,
]);

// A converted shootout kick isn't a match goal (see GOAL_EVENT_TYPES — it
// deliberately doesn't include this, so it stays out of ResultScreen's shot/
// possession counts), but it should still read like one here: same ⚽ and
// same side-colored highlight as a regular goal.
function isScoringEvent(event) {
  return GOAL_EVENT_TYPES.has(event.type) || event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED;
}

function eventEmoji(event) {
  if (event.cardType === 'red') return '🟥 ';
  if (event.cardType === 'yellow') return '🟨 ';
  if (event.victimId) return '🤕 ';
  if (isScoringEvent(event)) return '⚽ ';
  if (ALERT_EVENT_TYPES.has(event.type)) return '⚠️ ';
  if (WHISTLE_EVENT_TYPES.has(event.type)) return '📣 ';
  return '';
}

// Match-phase boundaries (kickoff, half-time, full-time, the shootout
// starting/ending) render as a centered "chapter" divider instead of a
// normal side-bordered row — ported from viewer.html's ev-divider.
const DIVIDER_EVENT_TYPES = new Set([
  EVENT_TYPES.KICKOFF,
  EVENT_TYPES.HALFTIME,
  EVENT_TYPES.FULLTIME,
  EVENT_TYPES.STOPPAGE_TIME_ANNOUNCED,
  EVENT_TYPES.SHOOTOUT_START,
  EVENT_TYPES.SHOOTOUT_WINNER,
]);

// Text-only styling per event category, ported from viewer.html's
// EVENT_CLASS — deliberately never blue or orange, since those are already
// "this is home's row" / "this is away's row" here (see eventRowClass
// below). A category is a WHAT happened, not a WHO it belongs to, so it
// shouldn't borrow either team's color and risk reading as a goal for that
// side. viewer.html itself used blue for saves and orange for scandalous
// fouls — both remapped here (to cyan and amber) for that reason.
const EVENT_CATEGORY_CLASS = {
  [EVENT_TYPES.NUTMEG_TAUNT]: 'text-purple-400 italic',
  [EVENT_TYPES.FIGHT_CALLOUT]: 'text-purple-400 italic',
  [EVENT_TYPES.SHOWBOATING]: 'text-purple-400 italic',
  [EVENT_TYPES.SCANDALOUS_FOUL]: 'text-amber-400 italic font-semibold',
  [EVENT_TYPES.GOALKEEPER_FORWARD]: 'text-amber-400 italic font-semibold',
  [EVENT_TYPES.HANDBALL_ON_THE_LINE]: 'text-amber-400 italic font-semibold',
  [EVENT_TYPES.DISALLOWED_GOAL]: 'text-red-400 font-bold',
  [EVENT_TYPES.PENALTY_NOT_GIVEN]: 'text-red-400 font-bold',
  [EVENT_TYPES.PENALTY_PHANTOM]: 'text-red-400 font-bold',
  [EVENT_TYPES.PENALTY_WRONG_LOCATION]: 'text-red-400 font-bold',
  [EVENT_TYPES.SEVERE_INJURY]: 'text-red-300',
  [EVENT_TYPES.NO_CARD_DESPITE_INJURY]: 'text-red-400 italic font-bold',
  [EVENT_TYPES.SCANDALOUS_FOUL_IGNORED]: 'text-red-400 italic font-bold',
  [EVENT_TYPES.OFFICIAL_ASSAULTED]: 'text-red-400 font-bold',
  [EVENT_TYPES.MATCH_ABANDONED]: 'text-red-400 font-bold',
  [EVENT_TYPES.TRASH_TALK]: 'text-yellow-300 italic',
  [EVENT_TYPES.PENALTY_MIND_GAMES]: 'text-yellow-300 italic',
  [EVENT_TYPES.CROWD_SILENCED]: 'text-yellow-300 italic',
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_SHORT]: 'text-yellow-300 italic',
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG]: 'text-yellow-300 italic',
  [EVENT_TYPES.WHIFF]: 'text-slate-400 italic',
  [EVENT_TYPES.WHIFF_HOME_MISS]: 'text-slate-400 italic',
  [EVENT_TYPES.WALL_SAVE]: 'text-cyan-400',
  [EVENT_TYPES.GOAL_LINE_CLEARANCE]: 'text-cyan-400',
  [EVENT_TYPES.TIME_WASTING]: 'text-slate-500 text-sm',
  [EVENT_TYPES.THROW_IN_DELAY]: 'text-slate-500 text-sm',
  [EVENT_TYPES.GOAL_KICK_DELAY]: 'text-slate-500 text-sm',
};

function eventTextClass(event) {
  if (event.cardType === 'red') return 'text-red-400 font-semibold';
  if (event.cardType === 'yellow') return 'text-yellow-300';
  return EVENT_CATEGORY_CLASS[event.type] ?? '';
}

// Same side colors as the lineup panels below (sky for home, orange for
// away), so a goal's highlight reads as "which side scored" at a glance.
// PLAYER_SPECIAL gets its own gold treatment instead — gold isn't used by
// either side, so it can't be misread as a goal highlight.
function eventRowClass(event) {
  if (isScoringEvent(event)) {
    return event.side === 'home'
      ? 'border-sky-500 bg-sky-950/60 font-semibold'
      : 'border-orange-500 bg-orange-950/60 font-semibold';
  }
  if (event.type === EVENT_TYPES.PLAYER_SPECIAL) {
    return 'border-yellow-500 bg-yellow-500/10 font-bold';
  }
  return 'border-slate-800 bg-slate-900';
}

function LineupPanel({ side, lineup, badgesByPlayer, sentOffIds }) {
  const averageOverall = (lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length).toFixed(1);
  return (
    <aside
      className={`w-48 shrink-0 overflow-y-auto py-2 ${side === 'home' ? 'border-r' : 'border-l'} border-slate-800`}
    >
      <p className="px-3 pb-2 text-[11px] text-slate-500">
        Overall médio: <span className="font-semibold text-slate-300">{averageOverall}</span>
      </p>
      {lineup.map((player) => {
        const badges = badgesByPlayer[player.id] ?? [];
        const sentOff = sentOffIds.has(player.id);
        return (
          <div
            key={player.id}
            className={`flex items-center gap-1.5 px-3 py-1 text-[13px] ${
              side === 'home' ? 'border-l-2' : 'border-r-2'
            } ${sentOff ? 'opacity-45' : ''} ${side === 'home' ? 'border-sky-500' : 'border-orange-500'}`}
          >
            <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-500">
              {POSITION_LABELS[player.position] ?? player.position}
            </span>
            <span className="flex-1 truncate" title={player.era ? `${player.name} (${player.era})` : player.name}>
              {player.name}
            </span>
            {player.era && (
              <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                '{String(player.era).slice(-2)}
              </span>
            )}
            <span className="flex shrink-0 items-center gap-0.5">
              {badges.map((badge, index) =>
                badge.type === 'goal' ? (
                  <span key={index} className="text-[11px] leading-none">
                    {badge.text}
                  </span>
                ) : badge.text ? (
                  <span
                    key={index}
                    className={`inline-flex h-3 w-3 items-center justify-center text-[9px] leading-none ${BADGE_STYLE[badge.type]}`}
                  >
                    {badge.text}
                  </span>
                ) : (
                  <span key={index} className={`inline-block h-3 w-3 ${BADGE_STYLE[badge.type]}`} />
                )
              )}
            </span>
          </div>
        );
      })}
    </aside>
  );
}

export default function MatchScreen({ matchData, onFinished }) {
  const { result, homeName, awayName, awayEra, homeLineup, awayLineup, shootout } = matchData;
  // The shootout, if any, plays out as more lines in the same log — no
  // separate screen, since the final is a single match (per CLAUDE.md scope)
  // and a draw just continues straight into the shootout.
  const allEvents = useMemo(() => [...result.events, ...(shootout?.events ?? [])], [result, shootout]);
  // Shootout events reuse the match clock internally just to keep the
  // combined log's pacing math simple (see resolvePenaltyShootout's
  // startMinute doc comment) — the number itself is meaningless in a
  // shootout (there's no such thing as "minute 97" in real football), so
  // anything from this index on skips the minute prefix in the log.
  const shootoutStartIndex = result.events.length;
  const [msPerMinute, setMsPerMinute] = useState(300);
  const [visibleCount, setVisibleCount] = useState(0);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [shootoutActive, setShootoutActive] = useState(false);
  const [shootoutScore, setShootoutScore] = useState({ home: 0, away: 0 });
  // Total kicks taken so far (scored or missed, either side) — the score
  // alone doesn't tell you how far into the shootout you are, especially
  // once it's 0-0 for a few rounds or deep into sudden death.
  const [shootoutKickCount, setShootoutKickCount] = useState(0);
  // Bumped whenever that side's score changes — used as a `key` on the
  // score span so React remounts it, which restarts the CSS pulse animation
  // every time (the same trick as viewer.html's classList remove/re-add,
  // just done the React way instead of touching the DOM directly).
  const [pulseKeys, setPulseKeys] = useState({ home: 0, away: 0 });
  const [badgesByPlayer, setBadgesByPlayer] = useState({});
  const [sentOffIds, setSentOffIds] = useState(new Set());
  const logEndRef = useRef(null);

  useEffect(() => {
    setVisibleCount(0);
    setScore({ home: 0, away: 0 });
    setShootoutActive(false);
    setShootoutScore({ home: 0, away: 0 });
    setShootoutKickCount(0);
    setPulseKeys({ home: 0, away: 0 });
    setBadgesByPlayer({});
    setSentOffIds(new Set());

    // Same pacing rule as viewer.html: events never appear less than
    // minEventGap apart in real time, even if they land in the same match
    // minute, otherwise a foul immediately followed by a card flies by
    // unreadably fast.
    const minEventGap = Math.max(500, msPerMinute * 2.2);
    // Each shootout kick gets extra breathing room — the whole point of a
    // shootout is the tension of one kick at a time, so it shouldn't fly by
    // at the same pace as regular-time events.
    const shootoutKickGap = minEventGap * 2.5;
    let delay = 300;
    let lastMinute = 0;
    const runningScore = { home: 0, away: 0 };
    const runningShootoutScore = { home: 0, away: 0 };
    const badgesAcc = {};
    const sentOffAcc = new Set();
    const timers = [];

    function addBadge(playerId, type, text) {
      if (!playerId) return;
      badgesAcc[playerId] = [...(badgesAcc[playerId] ?? []), { type, text }];
    }

    allEvents.forEach((event, index) => {
      const isShootoutKick = event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED || event.type === EVENT_TYPES.SHOOTOUT_KICK_MISSED;
      const gap = isShootoutKick ? shootoutKickGap : minEventGap;
      const minuteBasedDelay = delay + (event.minute - lastMinute) * msPerMinute;
      delay = Math.max(minuteBasedDelay, delay + gap);
      lastMinute = event.minute;

      timers.push(
        setTimeout(() => {
          setVisibleCount(index + 1);

          if (GOAL_EVENT_TYPES.has(event.type) || event.type === EVENT_TYPES.DISALLOWED_GOAL) {
            runningScore[event.side] += event.type === EVENT_TYPES.DISALLOWED_GOAL ? -1 : 1;
            setScore({ ...runningScore });
            setPulseKeys((prev) => ({ ...prev, [event.side]: prev[event.side] + 1 }));
          }
          if (event.type === EVENT_TYPES.SHOOTOUT_START) {
            setShootoutActive(true);
          }
          if (event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED || event.type === EVENT_TYPES.SHOOTOUT_KICK_MISSED) {
            setShootoutKickCount((count) => count + 1);
            if (event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED) {
              runningShootoutScore[event.side]++;
              setShootoutScore({ ...runningShootoutScore });
            }
          }

          if (event.victimId) addBadge(event.victimId, 'injury', '+');
          if (event.cardType && event.playerId) {
            addBadge(event.playerId, event.cardType === 'red' ? 'red' : 'yellow', '');
            if (event.cardType === 'red') sentOffAcc.add(event.playerId);
          }
          if (event.playerId && isScoringEvent(event)) addBadge(event.playerId, 'goal', '⚽');

          if (event.victimId || (event.cardType && event.playerId) || (event.playerId && isScoringEvent(event))) {
            setBadgesByPlayer({ ...badgesAcc });
            setSentOffIds(new Set(sentOffAcc));
          }
        }, delay)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [allEvents, msPerMinute]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleCount]);

  const visibleEvents = allEvents.slice(0, visibleCount);
  const finished = visibleCount === allEvents.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">
            {homeName} <span key={`home-${pulseKeys.home}`} className="animate-score-pulse">{score.home}</span> x{' '}
            <span key={`away-${pulseKeys.away}`} className="animate-score-pulse">{score.away}</span> {awayName}
            {awayEra ? ` (${awayEra})` : ''}
          </h2>
          <label className="text-sm text-slate-400">
            Velocidade{' '}
            <select
              value={msPerMinute}
              onChange={(e) => setMsPerMinute(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            >
              {SPEEDS.map((s) => (
                <option key={s.msPerMinute} value={s.msPerMinute}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {shootoutActive && (
          <div className="mx-auto mt-3 flex max-w-3xl items-center justify-center gap-4 rounded-lg border border-yellow-600/50 bg-yellow-500/10 px-4 py-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-yellow-400">Disputa de pênaltis</span>
            <span className="text-xl font-bold tabular-nums">
              {shootoutScore.home} x {shootoutScore.away}
            </span>
            <span className="text-sm text-slate-400">Cobrança nº {shootoutKickCount}</span>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 justify-center gap-6 overflow-hidden px-4 py-4">
        <LineupPanel side="home" lineup={homeLineup} badgesByPlayer={badgesByPlayer} sentOffIds={sentOffIds} />

        <div className="flex h-full w-full max-w-2xl flex-col gap-4 overflow-hidden">
          <ol className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {visibleEvents.map((event, index) =>
              DIVIDER_EVENT_TYPES.has(event.type) ? (
                <li key={index} className="my-1 text-center font-semibold text-slate-400">
                  {eventEmoji(event)}
                  {event.description}
                </li>
              ) : (
                <li key={index} className={`rounded border px-4 py-2 ${eventRowClass(event)}`}>
                  {index < shootoutStartIndex && <span className="mr-2 font-mono text-slate-500">{event.minute}'</span>}
                  {eventEmoji(event)}
                  <span className={eventTextClass(event)}>{event.description}</span>
                </li>
              )
            )}
            {finished && (
              <li className="flex items-center justify-between px-4 py-2">
                <p className="text-slate-400">Fim de jogo.</p>
                <button
                  onClick={onFinished}
                  className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Sair de campo
                </button>
              </li>
            )}
            <li ref={logEndRef} />
          </ol>
        </div>

        <LineupPanel side="away" lineup={awayLineup} badgesByPlayer={badgesByPlayer} sentOffIds={sentOffIds} />
      </div>
    </div>
  );
}
