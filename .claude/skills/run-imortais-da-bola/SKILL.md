---
name: run-imortais-da-bola
description: Build, run, and drive the imortais-da-bola Next.js web app in a real browser. Use when asked to start the app, run it, take a screenshot of its UI (including mobile-viewport checks), or verify a frontend/layout change actually renders.
---

This is a Next.js 15 (App Router, Turbopack dev) web app. Drive it with
Playwright via `.claude/skills/run-imortais-da-bola/driver.mjs`, which
walks the one real user flow the app has (pick a club -> build a squad
-> play a cup match) and screenshots every step. All paths below are
relative to the repo root.

Note: this project's actual dev environment is Windows (Git Bash), not
Linux — every command below was run and verified on Windows. If you're
on Linux, the Node/npm/Playwright commands are unchanged; only the
process-kill command in "Stop" needs a Unix equivalent (`lsof` +
`kill`, not `netstat`/`taskkill`).

## Prerequisites

Node >=18 (this session used Node 24). No system packages needed —
Playwright downloads its own browser binary rather than using an
OS-provided one.

## Setup

```bash
npm install
npx playwright install chromium
```

**Always re-run `npx playwright install chromium` after any `npm install`
that touches Playwright's version** (a fresh clone, a `package.json`
bump, `npm ci`) — see Gotchas below for what happens if you skip it.

## Build

No separate build step for the driver path — the dev server compiles
on demand. `npm run build` / `npm run start` exist for a production
build but this skill's driver has only been verified against `npm run
dev`.

## Run (agent path)

Start the dev server in the background and wait for it to actually
serve, then run the driver:

```bash
npm run dev > /tmp/nextdev.log 2>&1 &
timeout 40 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

node .claude/skills/run-imortais-da-bola/driver.mjs mobile
# or: node .claude/skills/run-imortais-da-bola/driver.mjs desktop   (default if omitted)
```

The driver navigates: home -> "Iniciar Copa" -> pick Corinthians ->
squad screen -> "Completar aleatoriamente" -> "Iniciar Copa" (cup
bracket) -> "Jogar a final" -> waits 8s for match events to stream in.
At each step it screenshots, checks `document.documentElement` for
horizontal overflow (`scrollWidth > clientWidth`), and collects
console errors. It prints a per-step report and **exits 1** if
anything overflowed or errored — safe to use as an automated check,
not just for screenshots.

Screenshots land in `.claude/skills/run-imortais-da-bola/screenshots/`
(gitignored — regenerated each run), named `1-home.png` … `7-match-
progress.png`.

`mobile` uses a 375×667 (iPhone SE) viewport — this is the viewport
that originally caught SquadScreen/MatchScreen's fixed-sidebar layouts
overflowing (see `DECISOES.md` decision 21 for what that looked like
and how it was fixed). Use `mobile` whenever verifying a layout/CSS
change; use `desktop` (1280×800) as a baseline "does it still render"
check.

`BASE_URL` env var overrides the default `http://localhost:3000` if
you're pointing the driver at a different port or a production build.

## Stop

```bash
netstat -ano | grep ':3000' | grep LISTENING | awk '{print $5}' | sort -u | xargs -r -I{} taskkill //F //PID {}
```

(`npm run dev &`'s `$!` is only the npm wrapper — it doesn't forward
the kill signal to the actual Next.js server, so killing by PID from
`$!` alone won't free the port. Kill by what's actually listening on
it instead, as above.)

## Run (human path)

```bash
npm run dev   # -> http://localhost:3000, Ctrl-C to stop
```

## Test

```bash
npm test
```

Node's built-in test runner (`node --test`) over `test/engine/*.test.js`
— pure engine unit tests, no browser involved. 47 tests passing as of
this skill's creation. Separate from this skill's driver, which
exercises the actual rendered UI.

---

## Gotchas

- **`browserType.launch: Executable doesn't exist at
  .../chrome-headless-shell.exe`** even right after running `npx
  playwright install chromium` — this happened mid-session here. The
  install command had resolved against a stale/global Playwright
  install, not the version actually pinned in `package.json` after
  `npm install` picked up the new `devDependencies` entry. Fix: run
  `npm install` first (so `node_modules/playwright`'s version matches
  `package.json`), *then* `npx playwright install chromium` — running
  the install command alone, before `npm install` has settled, can
  silently target the wrong version and report success without
  actually fetching the binary the local `node_modules/playwright`
  needs.
- **`npm run dev &`'s background PID isn't the server.** See "Stop"
  above — always kill by the port's actual listener, not `$!`.
- **The app has exactly one real flow** (pick club -> build squad ->
  play cup match) — there's no auth, no seeded data to worry about, no
  feature flags. The driver's one flow is the whole surface.

## Troubleshooting

- **Driver hangs on `page.waitForSelector('text=Iniciar Copa')` at the
  very first step**: the dev server isn't actually up yet — the
  `curl` poll loop in "Run (agent path)" should prevent this, but if
  you skipped it, check `/tmp/nextdev.log` for a Turbopack compile
  error first.
- **`2 vulnerabilities` after `npm install`**: pre-existing, in
  Next.js's own transitive `postcss` dependency — unrelated to
  Playwright, confirmed via `npm audit` during this skill's creation.
  Not something this driver introduces.
