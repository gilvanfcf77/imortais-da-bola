# Imortais da Bola

A web-based football manager game where you pick a Brazilian club, draw your
starting 11 from that club's historical players (from any era), and play
through a knockout cup. See `CLAUDE.md` for the full project context (in
Portuguese).

Fan project, with no official affiliation with any club or player mentioned.

## Requirements

- Node.js 18 or newer
- npm

## Installation

```bash
npm install
```

## Running the game

```bash
npm run dev
```

This starts the development server at **http://localhost:3000**. The flow is:
home screen → "Iniciar Copa" (Start Cup) → pick a club → build the team (draw
player by player or auto-complete at random) → cup bracket → match (with a
penalty shootout if tied) → result.

The game's interface is in Portuguese.

## Other scripts

- `npm test` — runs the engine's automated tests (`test/engine/`) with Node's
  native `node --test` (no extra dependency).
- `npm run match` — runs a sample match directly in the terminal, with no
  interface (useful for seeing the raw narrated events).
- `npm run calibrate` — runs 500 simulated matches and prints a frequency
  report (goals, cards, special events, etc.), saving a copy to `logs/`. Used
  to calibrate the engine constants in `src/engine/constants.js`.
- `npm run view` — starts a simple static server to open `viewer.html`, a
  development tool (outside the game flow) for watching matches with lineups,
  score, and draw for any matchup between clubs.
- `npm run build` / `npm run start` — Next.js production build.

## Project structure

- `src/engine/` — the simulation engine, isolated (it depends on nothing
  outside its folder — see decision 12 in `info/DECISOES.md`).
- `src/data/clubs/` — club data (a club is data, not code: each one lives in
  its own folder, with one JSON file per era).
- `src/app/` — the Next.js app (game screens and server actions).
- `scripts/` — the terminal scripts listed above.
- `test/engine/` — the engine's automated tests (`npm test`).
- `viewer.html` — development tool for watching matches outside the normal
  game flow.
- `info/` — project context documents (decisions made, progress, open items),
  all in Portuguese because they are meant for the team.

## Documentation

All of these documents are in Portuguese.

- `CLAUDE.md` — project overview, scope, and conventions.
- `info/DECISOES.md` — architecture decisions made so far, with the reasoning
  behind them.
- `info/PENDENCIAS.md` — questions still open.
- `info/PROGRESSO.md` — snapshot of the current state against the build order
  defined in `CLAUDE.md`.
