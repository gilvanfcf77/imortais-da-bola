'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENT_TYPES, GOAL_EVENT_TYPES, ROLE_TO_POSITION } from '../../engine/index.js';

const SPEEDS = [
  { label: 'lenta', msPerMinute: 900 },
  { label: 'normal', msPerMinute: 500 },
  { label: 'rápida', msPerMinute: 200 },
];

// Goalkeeper first, then defenders, then midfielders, then forwards —
// ROLE_TO_POSITION's own key order already lists roles in exactly this
// sequence (see formations.js), so it doubles as the canonical lineup
// order instead of duplicating it here.
const ROLE_ORDER = Object.keys(ROLE_TO_POSITION);

function sortByRole(lineup) {
  return [...lineup].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
}

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

// Everything the scoreboard/lineup panels show is derived fresh from
// whichever events are currently visible, rather than accumulated
// imperatively as each event's setTimeout fires. That split is what makes
// changing playback speed mid-match safe (see the scheduling effect in
// MatchScreen below): the schedule's only job is deciding how many events
// are visible, so it has no separate score/badge bookkeeping of its own
// that could fall out of sync — or get thrown away and restarted from
// kickoff — when the effect re-runs for a new msPerMinute.
function deriveMatchState(events) {
  const score = { home: 0, away: 0 };
  const shootoutScore = { home: 0, away: 0 };
  let shootoutActive = false;
  let shootoutKickCount = 0;
  const badgesByPlayer = {};
  const sentOffIds = new Set();

  function addBadge(playerId, type, text) {
    if (!playerId) return;
    badgesByPlayer[playerId] = [...(badgesByPlayer[playerId] ?? []), { type, text }];
  }

  for (const event of events) {
    // A WO overwrites the score with the fixed scoreline (see
    // checkMatchAbandoned in match.js) rather than adding to it.
    if (event.type === EVENT_TYPES.MATCH_ABANDONED) {
      score.home = event.homeGoals;
      score.away = event.awayGoals;
    } else if (GOAL_EVENT_TYPES.has(event.type) || event.type === EVENT_TYPES.DISALLOWED_GOAL) {
      score[event.side] += event.type === EVENT_TYPES.DISALLOWED_GOAL ? -1 : 1;
    }

    if (event.type === EVENT_TYPES.SHOOTOUT_START) shootoutActive = true;
    if (
      event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED ||
      event.type === EVENT_TYPES.SHOOTOUT_KICK_MISSED
    ) {
      shootoutKickCount++;
      if (event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED) shootoutScore[event.side]++;
    }

    if (event.victimId) addBadge(event.victimId, 'injury', '+');
    if (event.cardType && event.playerId) {
      addBadge(event.playerId, event.cardType === 'red' ? 'red' : 'yellow', '');
      if (event.cardType === 'red') sentOffIds.add(event.playerId);
    }
    if (event.playerId && isScoringEvent(event)) addBadge(event.playerId, 'goal', '⚽');
  }

  return { score, shootoutScore, shootoutActive, shootoutKickCount, badgesByPlayer, sentOffIds };
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
  [EVENT_TYPES.OUTFIELD_PLAYER_IN_GOAL]: 'text-amber-400 italic font-semibold',
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
  [EVENT_TYPES.GOAL_CELEBRATION_STALL]: 'text-slate-500 text-sm',
};

function eventTextClass(event) {
  if (event.cardType === 'red') return 'text-red-400 font-semibold';
  if (event.cardType === 'yellow') return 'text-yellow-300';
  return EVENT_CATEGORY_CLASS[event.type] ?? '';
}

const opposite = { home: 'away', away: 'home' };

// event.side is "which team this happened to" in the engine, which for
// FOUL/SCANDALOUS_FOUL means the team that COMMITTED the foul (see
// resolveFoul in match.js — pushed with offendingTeam.side, and stats.fouls
// tallies by that same side). Visually though, the color is meant to read
// as "which team this favors" — a goal favors the scorer, a penalty favors
// the team awarded it (already pushed with the attacking/awarded team's
// side, so no inversion needed there) — and a foul favors whoever gets the
// free kick, i.e. the opposite side from whoever committed it. Without this
// inversion, "falta marcada pro Flamengo" (decision 49's text) could render
// with the Corinthians-colored stripe, contradicting its own text.
function favoredSide(event) {
  if (event.type === EVENT_TYPES.FOUL || event.type === EVENT_TYPES.SCANDALOUS_FOUL) {
    return opposite[event.side];
  }
  return event.side;
}

// Same side colors as the lineup panels below (sky for home, orange for
// away), so a goal's highlight reads as "which side scored" at a glance.
// PLAYER_SPECIAL gets its own gold treatment instead — gold isn't used by
// either side, so it can't be misread as a goal highlight.
//
// Every other event (fouls, cards, penalties, saves, injuries...) still
// belongs to a side, so it gets a thin left-edge stripe in that side's
// color instead of the full border+background treatment goals get — that
// keeps a penalty for the away side reading as "away", not as a plain
// neutral card that could be mistaken for home's slate-blue-ish default.
function eventRowClass(event) {
  if (isScoringEvent(event)) {
    return event.side === 'home'
      ? 'border-sky-500 bg-sky-950/60 font-semibold'
      : 'border-orange-500 bg-orange-950/60 font-semibold';
  }
  if (event.type === EVENT_TYPES.PLAYER_SPECIAL) {
    return 'border-yellow-500 bg-yellow-500/10 font-bold';
  }
  const side = favoredSide(event);
  if (side === 'home') {
    return 'border-slate-800 border-l-4 border-l-sky-600 bg-slate-900';
  }
  if (side === 'away') {
    return 'border-slate-800 border-l-4 border-l-orange-600 bg-slate-900';
  }
  return 'border-slate-800 bg-slate-900';
}

// Mobile-only stand-in for LineupPanel (which is hidden below `md:` — see
// the render below): since there's no persistent side panel to check the
// squad on a phone, this renders the full lineup once, as its own card at
// the top of the event log, so it just scrolls away naturally like any
// other event instead of needing a toggle or its own screen. Desktop
// already shows this in LineupPanel, so it's `md:hidden` here to avoid
// showing the same 11 names twice.
function MobileLineupCard({ side, teamLabel, lineup }) {
  const ordered = sortByRole(lineup);
  const accent = side === 'home' ? 'border-sky-500' : 'border-orange-500';
  const averageOverall = (lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length).toFixed(1);
  return (
    <li className={`rounded border bg-slate-900 px-4 py-3 md:hidden ${accent}`}>
      <p className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-200">
        <span>Escalação — {teamLabel}</span>
        <span className="text-[11px] font-normal text-slate-500">
          Overall médio: <span className="font-semibold text-slate-300">{averageOverall}</span>
        </span>
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        {ordered.map((player) => (
          <div key={player.id} className="flex items-center gap-1.5 truncate">
            <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-500">
              {player.role ?? player.position}
            </span>
            <span className="truncate">{player.name}</span>
          </div>
        ))}
      </div>
    </li>
  );
}

function LineupPanel({ side, lineup, badgesByPlayer, sentOffIds }) {
  const averageOverall = (lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length).toFixed(1);
  const ordered = sortByRole(lineup);
  return (
    <aside
      className={`max-h-56 w-full shrink-0 overflow-y-auto py-2 md:max-h-none md:w-48 ${
        side === 'home' ? 'md:border-r' : 'md:border-l'
      } border-slate-800`}
    >
      <p className="px-3 pb-2 text-[11px] text-slate-500">
        Overall médio: <span className="font-semibold text-slate-300">{averageOverall}</span>
      </p>
      {ordered.map((player) => {
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
              {player.role ?? player.position}
            </span>
            <span className="flex-1 truncate" title={player.name}>
              {player.name}
            </span>
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
                ),
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
  const allEvents = useMemo(
    () => [...result.events, ...(shootout?.events ?? [])],
    [result, shootout],
  );
  // Shootout events reuse the match clock internally just to keep the
  // combined log's pacing math simple (see resolvePenaltyShootout's
  // startMinute doc comment) — the number itself is meaningless in a
  // shootout (there's no such thing as "minute 97" in real football), so
  // anything from this index on skips the minute prefix in the log.
  const shootoutStartIndex = result.events.length;
  const [msPerMinute, setMsPerMinute] = useState(500);
  const [visibleCount, setVisibleCount] = useState(0);
  // Bumped whenever that side's score changes — used as a `key` on the
  // score span so React remounts it, which restarts the CSS pulse animation
  // every time (the same trick as viewer.html's classList remove/re-add,
  // just done the React way instead of touching the DOM directly). This is
  // the one piece of scoreboard state that genuinely can't be derived from
  // `visibleEvents` alone (see the effect below) — it's about a transition
  // happening, not a value.
  const [pulseKeys, setPulseKeys] = useState({ home: 0, away: 0 });
  const logEndRef = useRef(null);
  // Mirrors `visibleCount` synchronously (state updates are async/batched)
  // so the scheduling effect below can read "how far did we get" the
  // instant it re-runs for a speed change, without waiting a render.
  const visibleCountRef = useRef(0);
  // Identity check for "is this actually a new match" vs. "just a speed
  // change" — `allEvents` is stable (useMemo, keyed on matchData) for the
  // whole life of one match, so a change here can only mean a new one.
  const prevAllEventsRef = useRef(null);

  // Schedules reveal timers for whichever events aren't visible yet. Only
  // resets to kickoff when `allEvents` itself changed (a new match); a
  // speed change alone resumes from `visibleCountRef.current` instead of
  // restarting the whole replay — this is the fix for switching speed mid-
  // match jumping back to minute 0.
  useEffect(() => {
    const isNewMatch = prevAllEventsRef.current !== allEvents;
    prevAllEventsRef.current = allEvents;
    const startIndex = isNewMatch ? 0 : visibleCountRef.current;
    if (isNewMatch) {
      visibleCountRef.current = 0;
      setVisibleCount(0);
    }

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
    let lastMinute = allEvents[startIndex - 1]?.minute ?? 0;
    const timers = [];

    allEvents.slice(startIndex).forEach((event, i) => {
      const index = startIndex + i;
      const isShootoutKick =
        event.type === EVENT_TYPES.SHOOTOUT_KICK_SCORED ||
        event.type === EVENT_TYPES.SHOOTOUT_KICK_MISSED;
      const gap = isShootoutKick ? shootoutKickGap : minEventGap;
      const minuteBasedDelay = delay + (event.minute - lastMinute) * msPerMinute;
      delay = Math.max(minuteBasedDelay, delay + gap);
      lastMinute = event.minute;

      timers.push(
        setTimeout(() => {
          visibleCountRef.current = index + 1;
          setVisibleCount(index + 1);
        }, delay),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [allEvents, msPerMinute]);

  const visibleEvents = useMemo(() => allEvents.slice(0, visibleCount), [allEvents, visibleCount]);
  const { score, shootoutScore, shootoutActive, shootoutKickCount, badgesByPlayer, sentOffIds } =
    useMemo(() => deriveMatchState(visibleEvents), [visibleEvents]);

  // Pulses whenever a side's derived score goes up — never on the drop back
  // to 0-0 at the start of a new match, since that's a decrease, not a goal.
  const prevScoreRef = useRef({ home: 0, away: 0 });
  useEffect(() => {
    if (score.home > prevScoreRef.current.home)
      setPulseKeys((prev) => ({ ...prev, home: prev.home + 1 }));
    if (score.away > prevScoreRef.current.away)
      setPulseKeys((prev) => ({ ...prev, away: prev.away + 1 }));
    prevScoreRef.current = score;
  }, [score]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleCount]);

  const finished = visibleCount === allEvents.length;

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-800 bg-slate-950 px-3 py-3 md:static md:px-4 md:py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 md:gap-4">
          <h2 className="text-lg font-bold md:text-2xl">
            {homeName}{' '}
            <span key={`home-${pulseKeys.home}`} className="animate-score-pulse">
              {score.home}
            </span>{' '}
            x{' '}
            <span key={`away-${pulseKeys.away}`} className="animate-score-pulse">
              {score.away}
            </span>{' '}
            {awayName}
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
          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-lg border border-yellow-600/50 bg-yellow-500/10 px-3 py-2 md:gap-4 md:px-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
              Disputa de pênaltis
            </span>
            <span className="text-xl font-bold tabular-nums">
              {shootoutScore.home} x {shootoutScore.away}
            </span>
            <span className="text-sm text-slate-400">Cobrança nº {shootoutKickCount}</span>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-3 py-3 md:flex-row md:justify-center md:gap-6 md:overflow-hidden md:px-4 md:py-4">
        <div className="hidden md:block">
          <LineupPanel
            side="home"
            lineup={homeLineup}
            badgesByPlayer={badgesByPlayer}
            sentOffIds={sentOffIds}
          />
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-4 md:h-full md:overflow-hidden">
          <ol className="flex flex-col gap-2 md:flex-1 md:overflow-y-auto">
            <MobileLineupCard side="home" teamLabel={homeName} lineup={homeLineup} />
            <MobileLineupCard
              side="away"
              teamLabel={awayEra ? `${awayName} (${awayEra})` : awayName}
              lineup={awayLineup}
            />
            {visibleEvents.map((event, index) =>
              DIVIDER_EVENT_TYPES.has(event.type) ? (
                <li key={index} className="my-1 text-center font-semibold text-slate-400">
                  {eventEmoji(event)}
                  {event.description}
                </li>
              ) : (
                <li key={index} className={`rounded border px-4 py-2 ${eventRowClass(event)}`}>
                  {index < shootoutStartIndex && (
                    <span className="mr-2 font-mono text-slate-500">{event.minute}'</span>
                  )}
                  {eventEmoji(event)}
                  <span className={eventTextClass(event)}>{event.description}</span>
                </li>
              ),
            )}
            {finished && (
              <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
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

        <div className="hidden md:block">
          <LineupPanel
            side="away"
            lineup={awayLineup}
            badgesByPlayer={badgesByPlayer}
            sentOffIds={sentOffIds}
          />
        </div>
      </div>
    </div>
  );
}
