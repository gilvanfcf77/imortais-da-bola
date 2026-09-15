// Plays a single match with a fixed seed and prints every narrated event, so
// the narration text can be eyeballed for readability (see CLAUDE.md "Motor
// de simulação" and "Tom dos eventos"). Run with: npm run match

import { createRng, FORMATIONS, draftEleven, simulateMatch } from '../src/engine/index.js';
import { SAMANGOS_DO_VALE, UNIAO_DA_PORRADA } from '../src/data/clubs/index.js';

const SEED = process.argv[2] ? Number(process.argv[2]) : 42;
const rng = createRng(SEED);
const formation = FORMATIONS['4-4-2'];

const homeLineup = draftEleven(SAMANGOS_DO_VALE.pool, formation, rng);
const awayLineup = draftEleven(UNIAO_DA_PORRADA.pool, formation, rng);

const home = {
  name: SAMANGOS_DO_VALE.name,
  lineup: homeLineup,
  posture: 'balanced',
  gamesmanship: 2,
};
const away = {
  name: UNIAO_DA_PORRADA.name,
  lineup: awayLineup,
  posture: 'defensive',
  gamesmanship: 3,
};

function printLineup(team) {
  console.log(
    `${team.name} (${formation.name}, postura ${team.posture}, catimba ${team.gamesmanship}):`,
  );
  for (const player of team.lineup) {
    const traits = player.traits.map((t) => `${t.slug}:${t.intensity}`).join(', ');
    console.log(
      `  [${player.position}] ${player.name} (${player.overall})${traits ? ' — ' + traits : ''}`,
    );
  }
  console.log('');
}

printLineup(home);
printLineup(away);

const result = simulateMatch({ home, away, rng });

for (const event of result.events) {
  console.log(`${String(event.minute).padStart(3, ' ')}' ${event.description}`);
}

console.log('');
console.log(`Placar final: ${home.name} ${result.homeGoals} x ${result.awayGoals} ${away.name}`);
console.log(
  `Faltas: ${result.stats.fouls} | Amarelos: ${result.stats.yellowCards} | Vermelhos: ${result.stats.redCards}`,
);
