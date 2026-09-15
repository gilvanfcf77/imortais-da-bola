'use client';

import { useEffect, useRef, useState } from 'react';

// App-wide background track — rendered once in page.js, above the
// per-screen conditional rendering, so the <audio> element survives screen
// transitions instead of restarting every time the player navigates. See
// public/audio/NOTICE.md for the track's license and required attribution.
//
// `silent` (driven by `screen === 'match'` in page.js) mutes it specifically
// during a live match — that gap is reserved for crowd noise, whistles and
// goal chants once those exist (see info/PENDENCIAS.md), not music, not
// built yet. Separate from `userMuted` below, which is the player's own
// manual toggle and persists across screens on its own.
export default function MusicPlayer({ silent }) {
  const audioRef = useRef(null);
  const [userMuted, setUserMuted] = useState(false);
  // Read inside the one-time click listener below, which only ever runs
  // once — a ref instead of state so it always sees the current values
  // without needing to re-subscribe the listener every time either changes.
  const desiredRef = useRef({ silent, userMuted });
  desiredRef.current = { silent, userMuted };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Browsers only allow audio to start from a real user gesture — and
    // specifically one where .play() is called during (or very shortly
    // after) the gesture's own event handler. A screen change caused BY a
    // click doesn't itself re-run this effect (silent/userMuted don't
    // change on most navigation), so relying on that alone left the track
    // silently stuck paused forever outside of an automated test browser,
    // which is more lenient about this than a real one. Listening for the
    // very first click/keydown anywhere on the page and starting playback
    // right there is what actually satisfies that requirement; once
    // unlocked this way, the effect below is free to pause/resume the same
    // <audio> element programmatically for every later screen change or
    // mute toggle without needing another fresh gesture.
    function unlock() {
      if (!desiredRef.current.silent && !desiredRef.current.userMuted) {
        audio.play().catch(() => {});
      }
    }
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (silent || userMuted) audio.pause();
    else audio.play().catch(() => {});
  }, [silent, userMuted]);

  return (
    <>
      <audio ref={audioRef} src="/audio/lofi-ketsa-mix4.mp3" loop preload="auto" />
      <button
        type="button"
        onClick={() => setUserMuted((muted) => !muted)}
        // The tooltip doubles as this track's required CC BY attribution
        // (see public/audio/NOTICE.md) — a hover title is a minimal, easy-
        // to-miss way to satisfy "reasonable manner", worth upgrading to an
        // actual visible credits/about screen before any public launch (see
        // info/PENDENCIAS.md, alongside the fan-project disclaimer CLAUDE.md
        // already calls for).
        title={
          (userMuted ? 'Ativar música' : 'Silenciar música') +
          ' — "Lofi Hip Hop Mix 4" por Ketsa (ketsa.uk), CC BY 4.0'
        }
        aria-label={userMuted ? 'Ativar música' : 'Silenciar música'}
        className="fixed right-4 bottom-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-lg text-slate-300 shadow-lg backdrop-blur transition hover:border-slate-500 hover:text-white"
      >
        {userMuted ? '🔇' : '🎵'}
      </button>
    </>
  );
}
