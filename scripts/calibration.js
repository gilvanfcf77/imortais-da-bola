// Runs many matches with a fixed base seed and reports averages, so a
// constant in src/engine/constants.js can be tweaked and the report re-run
// to see exactly what changed. See CLAUDE.md "Ordem de construção" #1.
// Every run also saves a timestamped copy of the report under logs/, so past
// calibration runs can be diffed instead of only living in scrollback.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRng, FORMATIONS, draftEleven, simulateMatch, EVENT_TYPES, GOAL_EVENT_TYPES } from '../src/engine/index.js';
import {
  SAMANGOS_DO_VALE,
  CAPETAS_DA_SERRA,
  FERROLHO_DO_SERTAO,
  OUSADIA_E_ALEGRIA,
  getClubEras,
} from '../src/data/clubs/index.js';

const lines = [];
function log(line = '') {
  lines.push(line);
  console.log(line);
}

const MATCH_COUNT = 500;
const BASE_SEED = 20260829;
const FORMATION = FORMATIONS['4-4-2'];
const CORINTHIANS_1977 = getClubEras('corinthians').find((era) => era.era === 1977);
const SAO_PAULO_2008 = getClubEras('sao-paulo').find((era) => era.era === 2008);

// Same approximation used by the frontend's ResultScreen (src/app/components/
// ResultScreen.jsx): the engine has no continuous possession state, only
// independent per-minute attack rolls per side (see match.js simulateMinute),
// so "possession" is estimated as each side's share of attack sequences —
// every event below is the resolution of exactly one such sequence.
// DISALLOWED_GOAL is left out since it fires on a shot a GOAL_EVENT_TYPES
// event already counted.
const SHOT_EVENT_TYPES = new Set([
  ...GOAL_EVENT_TYPES,
  EVENT_TYPES.WHIFF,
  EVENT_TYPES.WHIFF_HOME_MISS,
  EVENT_TYPES.CHANCE_MISSED,
  EVENT_TYPES.WALL_SAVE,
  EVENT_TYPES.GOAL_LINE_CLEARANCE,
  EVENT_TYPES.HANDBALL_ON_THE_LINE,
  EVENT_TYPES.PENALTY_MISSED,
]);

function countShotsBySide(events) {
  const counts = { home: 0, away: 0 };
  for (const event of events) {
    if (event.side && SHOT_EVENT_TYPES.has(event.type)) counts[event.side]++;
  }
  return counts;
}

function playOneMatch(seed) {
  const rng = createRng(seed);
  const homeLineup = draftEleven(CORINTHIANS_1977.pool, FORMATION, rng);
  const awayLineup = draftEleven(SAO_PAULO_2008.pool, FORMATION, rng);

  const home = { name: 'Corinthians (1977)', lineup: homeLineup, posture: 'balanced', gamesmanship: 3 };
  const away = { name: 'São Paulo (2008)', lineup: awayLineup, posture: 'attacking', gamesmanship: 0 };

  const goalkeeperIds = new Set(
    [...homeLineup, ...awayLineup].filter((p) => p.position === 'GK').map((p) => p.id)
  );

  return { result: simulateMatch({ home, away, rng }), goalkeeperIds };
}

// A goal event only carries `playerId`, not position, so cross-reference
// against that match's drafted goalkeepers to count how often one of them
// is the one credited with the goal (join-the-attack situations, a
// free-kick specialist trait on a keeper, etc. — see GOALKEEPER_FORWARD).
function countGoalkeeperGoals(result, goalkeeperIds) {
  return result.events.filter((e) => GOAL_EVENT_TYPES.has(e.type) && goalkeeperIds.has(e.playerId)).length;
}

function average(total) {
  return (total / MATCH_COUNT).toFixed(2);
}

function averageOverall(pool) {
  return (pool.reduce((sum, p) => sum + p.overall, 0) / pool.length).toFixed(1);
}

const totals = {
  goals: 0,
  homeGoals: 0,
  awayGoals: 0,
  fouls: 0,
  yellowCards: 0,
  redCards: 0,
  nutmegTaunts: 0,
  brawls: 0,
  scandalousFouls: 0,
  disallowedGoals: 0,
  severeInjuries: 0,
  noCardDespiteInjury: 0,
  trashTalks: 0,
  fightCallouts: 0,
  whiffs: 0,
  goalStyles: {
    plain: 0,
    individual: 0,
    assisted: 0,
    corner: 0,
    longShot: 0,
    defensiveBlunder: 0,
    goalkeeperBlunder: 0,
    penalty: 0,
  },
  penaltiesAwarded: 0,
  penaltiesNotGiven: 0,
  penaltiesPhantom: 0,
  penaltiesWrongLocation: 0,
  penaltyMindGames: 0,
  penaltiesMissed: 0,
  goalkeeperForward: 0,
  crowdSilenced: 0,
  showboating: 0,
  refereeDeflectionGoals: 0,
  specialAbilities: 0,
  stoppageTimeBooed: 0,
  throwInDelays: 0,
  goalKickDelays: 0,
  goalkeeperGoals: 0,
  officialsAssaulted: 0,
  handballsOnTheLine: 0,
  shots: { home: 0, away: 0 },
};
let matchesWithRedCard = 0;
let matchesWithComedy = 0;
let homeWins = 0;
let awayWins = 0;
let draws = 0;
// Checks whether being down a player actually hurts more now (see the
// SHORT_HANDED_DEFENSE_PENALTY asymmetry in teamPower/match.js) — only
// counts matches where exactly one side had at least one red card, since a
// match with red cards on both sides doesn't isolate "who was down a man".
let oneSidedRedCardMatches = 0;
let marginForSentOffSide = 0;

for (let i = 0; i < MATCH_COUNT; i++) {
  const { result, goalkeeperIds } = playOneMatch(BASE_SEED + i);
  totals.goalkeeperGoals += countGoalkeeperGoals(result, goalkeeperIds);

  const shots = countShotsBySide(result.events);
  totals.shots.home += shots.home;
  totals.shots.away += shots.away;

  totals.goals += result.homeGoals + result.awayGoals;
  totals.homeGoals += result.homeGoals;
  totals.awayGoals += result.awayGoals;
  if (result.homeGoals > result.awayGoals) homeWins++;
  else if (result.awayGoals > result.homeGoals) awayWins++;
  else draws++;
  totals.fouls += result.stats.fouls;
  totals.yellowCards += result.stats.yellowCards;
  totals.redCards += result.stats.redCards;
  totals.nutmegTaunts += result.stats.nutmegTaunts;
  totals.brawls += result.stats.brawls;
  totals.scandalousFouls += result.stats.scandalousFouls;
  totals.disallowedGoals += result.stats.disallowedGoals;
  totals.officialsAssaulted += result.stats.officialsAssaulted;
  totals.handballsOnTheLine += result.stats.handballsOnTheLine;
  totals.severeInjuries += result.stats.severeInjuries;
  totals.noCardDespiteInjury += result.stats.noCardDespiteInjury;
  totals.trashTalks += result.stats.trashTalks;
  totals.fightCallouts += result.stats.fightCallouts;
  totals.whiffs += result.stats.whiffs;
  for (const style of Object.keys(totals.goalStyles)) {
    totals.goalStyles[style] += result.stats.goalStyles[style];
  }
  totals.penaltiesAwarded += result.stats.penaltiesAwarded;
  totals.penaltiesNotGiven += result.stats.penaltiesNotGiven;
  totals.penaltiesPhantom += result.stats.penaltiesPhantom;
  totals.penaltiesWrongLocation += result.stats.penaltiesWrongLocation;
  totals.penaltyMindGames += result.stats.penaltyMindGames;
  totals.penaltiesMissed += result.stats.penaltiesMissed;
  totals.goalkeeperForward += result.stats.goalkeeperForward;
  totals.crowdSilenced += result.stats.crowdSilenced;
  totals.showboating += result.stats.showboating;
  totals.refereeDeflectionGoals += result.stats.refereeDeflectionGoals;
  totals.specialAbilities += result.stats.specialAbilities;
  totals.stoppageTimeBooed += result.stats.stoppageTimeBooed;
  totals.throwInDelays += result.stats.throwInDelays;
  totals.goalKickDelays += result.stats.goalKickDelays;

  if (result.stats.redCards > 0) matchesWithRedCard++;
  const redHome = result.stats.redCardsBySide.home > 0;
  const redAway = result.stats.redCardsBySide.away > 0;
  if (redHome !== redAway) {
    oneSidedRedCardMatches++;
    marginForSentOffSide += redHome
      ? result.homeGoals - result.awayGoals
      : result.awayGoals - result.homeGoals;
  }
  if (
    result.stats.officialsAssaulted > 0 ||
    result.stats.brawls > 0 ||
    result.stats.scandalousFouls > 0 ||
    result.stats.fightCallouts > 0
  )
    matchesWithComedy++;
}

log(`Calibragem — ${MATCH_COUNT} partidas simuladas (seed base ${BASE_SEED})`);
log(`Corinthians (1977, casa, equilibrado, catimba 3) x São Paulo (2008, fora, ofensivo, catimba 0), formação ${FORMATION.name}`);
log(
  `Overall médio do elenco: casa ${averageOverall(CORINTHIANS_1977.pool)} / fora ${averageOverall(SAO_PAULO_2008.pool)}`
);
log('');
log(
  `Vitórias casa: ${homeWins} (${((homeWins / MATCH_COUNT) * 100).toFixed(1)}%) | Vitórias fora: ${awayWins} (${((awayWins / MATCH_COUNT) * 100).toFixed(1)}%) | Empates: ${draws} (${((draws / MATCH_COUNT) * 100).toFixed(1)}%)`
);
log('');
log(`Gols por partida (total):      ${average(totals.goals)}`);
log(`  - time da casa:              ${average(totals.homeGoals)}`);
log(`  - time visitante:            ${average(totals.awayGoals)}`);
const totalShots = totals.shots.home + totals.shots.away;
const homePossessionPct = totalShots > 0 ? ((totals.shots.home / totalShots) * 100).toFixed(1) : '50.0';
const awayPossessionPct = totalShots > 0 ? ((totals.shots.away / totalShots) * 100).toFixed(1) : '50.0';
log(`Finalizações por partida:      ${average(totalShots)} (casa ${average(totals.shots.home)} / fora ${average(totals.shots.away)})`);
log(`Posse de bola (aprox., ver ResultScreen.jsx): casa ${homePossessionPct}% / fora ${awayPossessionPct}%`);
log(`Faltas por partida:            ${average(totals.fouls)}`);
log(`Cartões amarelos por partida:  ${average(totals.yellowCards)}`);
log(`Cartões vermelhos por partida: ${average(totals.redCards)}`);
log(`  - partidas com expulsão:     ${matchesWithRedCard} (${((matchesWithRedCard / MATCH_COUNT) * 100).toFixed(1)}%)`);
const avgMarginSentOff =
  oneSidedRedCardMatches > 0 ? (marginForSentOffSide / oneSidedRedCardMatches).toFixed(2) : 'n/a';
log(
  `  - saldo médio de quem fica com 10 (só partidas com vermelho de 1 lado): ${avgMarginSentOff} (${oneSidedRedCardMatches} partidas)`
);
log('');
log('Eventos cômicos (checagem de frequência, ver CLAUDE.md "Tom dos eventos"):');
log(`  - chapéus com provocação:    ${totals.nutmegTaunts} (${(totals.nutmegTaunts / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - confusões generalizadas:   ${totals.brawls} (${(totals.brawls / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - faltas escandalosas:       ${totals.scandalousFouls} (${(totals.scandalousFouls / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - gols anulados por erro:    ${totals.disallowedGoals} (${(totals.disallowedGoals / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - agressão a árbitro/bandeirinha (durante falta ou após anulação): ${totals.officialsAssaulted} (${(totals.officialsAssaulted / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - mão na bola em cima da linha: ${totals.handballsOnTheLine} (${(totals.handballsOnTheLine / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - lesões graves:             ${totals.severeInjuries} (${(totals.severeInjuries / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - sem cartão apesar da lesão:${totals.noCardDespiteInjury} (${(totals.noCardDespiteInjury / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - provocações (fala/gesto):  ${totals.trashTalks} (${(totals.trashTalks / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - chamadas pra briga:        ${totals.fightCallouts} (${(totals.fightCallouts / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - furadas com vaia:          ${totals.whiffs} (${(totals.whiffs / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - partidas com algum cômico: ${matchesWithComedy} (${((matchesWithComedy / MATCH_COUNT) * 100).toFixed(1)}%)`);
log('');
log('Como os gols de bola rolando aconteceram (fora gol de falta, que é à parte):');
const totalOpenPlayGoals = Object.values(totals.goalStyles).reduce((sum, count) => sum + count, 0);
const GOAL_STYLE_LABELS = {
  plain: 'sem detalhe (jogada genérica)',
  individual: 'jogada individual',
  assisted: 'assistência',
  corner: 'escanteio',
  longShot: 'chute de longe',
  defensiveBlunder: 'lambança da defesa',
  goalkeeperBlunder: 'frango do goleiro',
  penalty: 'pênalti',
};
for (const [style, label] of Object.entries(GOAL_STYLE_LABELS)) {
  const count = totals.goalStyles[style];
  const pct = totalOpenPlayGoals > 0 ? ((count / totalOpenPlayGoals) * 100).toFixed(1) : '0.0';
  log(`  - ${label.padEnd(24)}: ${count} (${pct}%)`);
}
log('');
log('Pênaltis (situação, não só o gol):');
log(`  - dados de verdade:          ${totals.penaltiesAwarded} (${(totals.penaltiesAwarded / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - claros e não marcados:     ${totals.penaltiesNotGiven} (${(totals.penaltiesNotGiven / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - fantasmas (não existiram): ${totals.penaltiesPhantom} (${(totals.penaltiesPhantom / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - falta fora da área, erro do juiz: ${totals.penaltiesWrongLocation} (${(totals.penaltiesWrongLocation / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - com pressão do goleiro:    ${totals.penaltyMindGames} (${(totals.penaltyMindGames / MATCH_COUNT).toFixed(3)} por partida)`);
log(`  - perdidos na cobrança:      ${totals.penaltiesMissed} (${(totals.penaltiesMissed / MATCH_COUNT).toFixed(3)} por partida)`);
const totalPenaltiesTaken = totals.penaltiesMissed + totals.goalStyles.penalty;
const penaltyConversionPct = totalPenaltiesTaken > 0 ? ((totals.goalStyles.penalty / totalPenaltiesTaken) * 100).toFixed(1) : '0.0';
log(`  - conversão na cobrança:     ${penaltyConversionPct}% (referência real: ~75-80%)`);
log('');
log(`Goleiro-linha (desespero em bola parada, atrás no placar, minuto >= 82): ${totals.goalkeeperForward} (${(totals.goalkeeperForward / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Torcida calada (visitante vira o jogo e provoca a torcida da casa): ${totals.crowdSilenced} (${(totals.crowdSilenced / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Embaixadinhas (2º tempo, vencendo por 2+ gols): ${totals.showboating} (${(totals.showboating / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Gol com desvio no juiz: ${totals.refereeDeflectionGoals} (${(totals.refereeDeflectionGoals / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Eventos especiais de jogador (specialAbility): ${totals.specialAbilities} (${(totals.specialAbilities / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Torcida vaia o acréscimo: ${totals.stoppageTimeBooed} (${(totals.stoppageTimeBooed / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Demora no lateral: ${totals.throwInDelays} (${(totals.throwInDelays / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Demora no tiro de meta: ${totals.goalKickDelays} (${(totals.goalKickDelays / MATCH_COUNT).toFixed(3)} por partida)`);
log(`Gols marcados por goleiro: ${totals.goalkeeperGoals} (${(totals.goalkeeperGoals / MATCH_COUNT).toFixed(3)} por partida)`);

// Hypothesis check for the PENDENCIAS.md item "posse de bola deve
// correlacionar com força do time": Ferrolho do Sertão (overall médio ~60.5)
// vs Ousadia e Alegria (overall médio ~99) is a genuine ~38-point mismatch.
// União da Porrada was considered instead of Ousadia e Alegria, but it's
// also maxed at ~99 overall — not actually weaker than Ousadia e Alegria,
// so it wouldn't test anything here.
log('');
log('Teste de hipótese — posse de bola deve cair com a força do time:');
log(
  `Ferrolho do Sertão (casa, overall médio ${averageOverall(FERROLHO_DO_SERTAO.pool)}) x Ousadia e Alegria (fora, overall médio ${averageOverall(OUSADIA_E_ALEGRIA.pool)})`
);
const MISMATCH_SEED = BASE_SEED + 1_000_000;
const mismatchTotals = { homeGoals: 0, awayGoals: 0, shots: { home: 0, away: 0 } };
for (let i = 0; i < MATCH_COUNT; i++) {
  const rng = createRng(MISMATCH_SEED + i);
  const homeLineup = draftEleven(FERROLHO_DO_SERTAO.pool, FORMATION, rng);
  const awayLineup = draftEleven(OUSADIA_E_ALEGRIA.pool, FORMATION, rng);
  const home = { name: FERROLHO_DO_SERTAO.name, lineup: homeLineup, posture: 'balanced', gamesmanship: 1 };
  const away = { name: OUSADIA_E_ALEGRIA.name, lineup: awayLineup, posture: 'balanced', gamesmanship: 1 };
  const result = simulateMatch({ home, away, rng });

  mismatchTotals.homeGoals += result.homeGoals;
  mismatchTotals.awayGoals += result.awayGoals;
  const shots = countShotsBySide(result.events);
  mismatchTotals.shots.home += shots.home;
  mismatchTotals.shots.away += shots.away;
}
const mismatchTotalShots = mismatchTotals.shots.home + mismatchTotals.shots.away;
const mismatchHomePossessionPct =
  mismatchTotalShots > 0 ? ((mismatchTotals.shots.home / mismatchTotalShots) * 100).toFixed(1) : '50.0';
const mismatchAwayPossessionPct =
  mismatchTotalShots > 0 ? ((mismatchTotals.shots.away / mismatchTotalShots) * 100).toFixed(1) : '50.0';
log(
  `  - gols por partida: casa (fraco) ${average(mismatchTotals.homeGoals)} / fora (forte) ${average(mismatchTotals.awayGoals)}`
);
log(
  `  - finalizações por partida: casa (fraco) ${average(mismatchTotals.shots.home)} / fora (forte) ${average(mismatchTotals.shots.away)}`
);
log(`  - posse de bola: casa (fraco) ${mismatchHomePossessionPct}% / fora (forte) ${mismatchAwayPossessionPct}%`);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const logsDir = join(projectRoot, 'logs');
mkdirSync(logsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = join(logsDir, `calibration-${timestamp}.log`);
writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');
console.log(`\nLog salvo em ${logPath}`);
