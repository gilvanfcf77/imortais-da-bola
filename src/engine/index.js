// Public entry point of the engine. Per DECISOES.md #12, the engine never
// imports anything from outside this folder — it receives data, returns
// events. Anything outside (future API routes, frontend, scripts) should
// import only from here, not from the individual engine files.

export { createRng } from './rng.js';
export { FORMATIONS, totalPlayers, ROLE_TO_POSITION } from './formations.js';
export {
  TRAITS,
  getTraitIntensity,
  sumTraitIntensity,
  combineMultipliers,
  defaultGamesmanship,
} from './traits.js';
export { draftEleven, draftBestEleven, draftBestFormationEleven } from './draft.js';
export { simulateMatch, resolvePenaltyShootout } from './match/index.js';
export { EVENT_TYPES, GOAL_EVENT_TYPES, narrate, templatesFor } from './narration/index.js';
