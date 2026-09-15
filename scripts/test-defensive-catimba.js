// Hypothesis check: does setting the weaker team's posture to 'defensive'
// and gamesmanship to the max (3) actually help it hold at least a draw
// more often, compared to its normal ('balanced', catimba 0) setup?
//
// Runs MATCH_COUNT paired matches — same seed, same drafted lineups on both
// sides, only the home team's posture/gamesmanship differ between the two
// arms — so any difference in the draw-or-better rate is attributable to
// that change, not to draft randomness (same reasoning as scripts/
// calibration.js's own paired-seed comparisons). Run with: npm run test:defensive-catimba

import { createRng, FORMATIONS, draftEleven, simulateMatch } from '../src/engine/index.js';
import { FERROLHO_DO_SERTAO, OUSADIA_E_ALEGRIA } from '../src/data/clubs/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lines = [];
function log(line = '') {
  lines.push(line);
  console.log(line);
}

const MATCH_COUNT = 500;
const BASE_SEED = 20260830;
const FORMATION = FORMATIONS['4-4-2'];

// Ferrolho do Sertão (weak) at home against Ousadia e Alegria (strong) away
// — same mismatch scripts/calibration.js already used to check the
// possession/strength hypothesis, so the overall gap here is known to be
// real (~60 vs ~99 overall), not a fluke of one draft.
const WEAK = FERROLHO_DO_SERTAO;
const STRONG = OUSADIA_E_ALEGRIA;

// Home wins outright, or the match ends level (regulation only — a
// shootout is irrelevant to "held a draw", and only happens once
// regulation is already level, so it can't change this count either way).
// An abandoned match only counts as "held" if the away side is the one
// that collapsed — the home side dropping below 7 players is a clear loss,
// not a draw, regardless of the scoreline WO assigns.
function homeHeldAtLeastADraw(result) {
  if (result.abandoned) return result.abandonedSide === 'away';
  return result.homeGoals >= result.awayGoals;
}

function playPair(seed) {
  // Both arms draft from the identical rng state, so both get the exact
  // same 11 players on each side — the only thing that can differ between
  // arms from here on is home's posture/gamesmanship.
  const draftRng = createRng(seed);
  const weakLineup = draftEleven(WEAK.pool, FORMATION, draftRng);
  const strongLineup = draftEleven(STRONG.pool, FORMATION, draftRng);

  const away = { name: STRONG.name, lineup: strongLineup, posture: 'balanced', gamesmanship: 1 };

  const baselineHome = {
    name: WEAK.name,
    lineup: weakLineup,
    posture: 'balanced',
    gamesmanship: 0,
  };
  const baselineResult = simulateMatch({ home: baselineHome, away, rng: createRng(seed + 1) });

  const defensiveHome = {
    name: WEAK.name,
    lineup: weakLineup,
    posture: 'defensive',
    gamesmanship: 3,
  };
  const defensiveResult = simulateMatch({ home: defensiveHome, away, rng: createRng(seed + 1) });

  return { baselineResult, defensiveResult };
}

let baselineHeld = 0;
let defensiveHeld = 0;
let flippedToHeld = 0; // baseline lost, defensive+catimba held it
let flippedToLost = 0; // baseline held, defensive+catimba lost it (should be rare)
let baselineGoalDiff = 0;
let defensiveGoalDiff = 0;
let baselineFouls = 0;
let defensiveFouls = 0;
let baselineCards = 0;
let defensiveCards = 0;

for (let i = 0; i < MATCH_COUNT; i++) {
  const { baselineResult, defensiveResult } = playPair(BASE_SEED + i * 2);

  const baselineOk = homeHeldAtLeastADraw(baselineResult);
  const defensiveOk = homeHeldAtLeastADraw(defensiveResult);
  if (baselineOk) baselineHeld++;
  if (defensiveOk) defensiveHeld++;
  if (!baselineOk && defensiveOk) flippedToHeld++;
  if (baselineOk && !defensiveOk) flippedToLost++;

  baselineGoalDiff += baselineResult.homeGoals - baselineResult.awayGoals;
  defensiveGoalDiff += defensiveResult.homeGoals - defensiveResult.awayGoals;
  baselineFouls += baselineResult.stats.foulsBySide.home;
  defensiveFouls += defensiveResult.stats.foulsBySide.home;
  baselineCards +=
    baselineResult.stats.yellowCardsBySide.home + baselineResult.stats.redCardsBySide.home;
  defensiveCards +=
    defensiveResult.stats.yellowCardsBySide.home + defensiveResult.stats.redCardsBySide.home;
}

function pct(n) {
  return ((n / MATCH_COUNT) * 100).toFixed(1);
}
function avg(n) {
  return (n / MATCH_COUNT).toFixed(2);
}

log(`Postura defensiva + catimba 3 realmente ajudam a segurar um empate?`);
log(
  `${WEAK.name} (casa, fraco) x ${STRONG.name} (fora, forte) — ${MATCH_COUNT} pares de partidas (seed base ${BASE_SEED})`,
);
log(
  `Cada par usa o MESMO sorteio de elenco dos dois lados; só a postura/catimba da casa muda entre os dois braços.`,
);
log('');
log(
  `Empate ou vitória da casa — baseline (equilibrada, catimba 0):     ${baselineHeld} (${pct(baselineHeld)}%)`,
);
log(
  `Empate ou vitória da casa — defensiva + catimba 3:                ${defensiveHeld} (${pct(defensiveHeld)}%)`,
);
log(
  `Diferença: ${pct(defensiveHeld) - pct(baselineHeld) >= 0 ? '+' : ''}${(pct(defensiveHeld) - pct(baselineHeld)).toFixed(1)} pontos percentuais`,
);
log('');
log(
  `Pares que viraram de "perdendo" pra "segurou" com defensiva+catimba: ${flippedToHeld} (${pct(flippedToHeld)}%)`,
);
log(
  `Pares que viraram de "segurou" pra "perdendo" com defensiva+catimba: ${flippedToLost} (${pct(flippedToLost)}%)`,
);
log('');
log(`Saldo de gols médio da casa — baseline:            ${avg(baselineGoalDiff)}`);
log(`Saldo de gols médio da casa — defensiva + catimba: ${avg(defensiveGoalDiff)}`);
log('');
log(`Faltas da casa por partida — baseline:            ${avg(baselineFouls)}`);
log(`Faltas da casa por partida — defensiva + catimba: ${avg(defensiveFouls)}`);
log(`Cartões da casa por partida — baseline:            ${avg(baselineCards)}`);
log(`Cartões da casa por partida — defensiva + catimba: ${avg(defensiveCards)}`);
log('');
log(
  defensiveHeld > baselineHeld
    ? '=> Hipótese CONFIRMADA: defensiva + catimba máxima aumenta a taxa de "pelo menos empate" da casa.'
    : defensiveHeld === baselineHeld
      ? '=> Hipótese NÃO CONFIRMADA: nenhuma diferença na taxa de "pelo menos empate".'
      : '=> Hipótese CONTRARIADA: defensiva + catimba máxima piorou a taxa de "pelo menos empate" da casa.',
);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const logsDir = join(projectRoot, 'logs');
mkdirSync(logsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = join(logsDir, `defensive-catimba-${timestamp}.log`);
writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');
console.log(`\nLog salvo em ${logPath}`);
