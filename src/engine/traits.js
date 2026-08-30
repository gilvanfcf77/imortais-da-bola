// Trait definitions (see CLAUDE.md "Traços"). Traits are attached to a
// player's stint at a club (a "passagem" in the data model), not to the
// player globally, so the same name can have a different profile in
// different eras. Each trait has an `intensity` of 1-3.
//
// English slug -> Portuguese slug from CLAUDE.md/DECISOES.md:
//   freeKickSpecialist -> batedor_faltas
//   shortFuse          -> pavio_curto
//   cynicalFouler      -> catimbeiro
//   sharpshooter       -> artilheiro
//   playmaker          -> garcom
//   wall               -> muralha
//   dribbler           -> driblador
//   leader             -> lider

export const TRAITS = {
  freeKickSpecialist: {
    name: 'Free-kick specialist',
    description: 'Higher chance of scoring directly from a foul.',
  },
  shortFuse: {
    name: 'Short fuse',
    description:
      'More likely to be picked as the offender in a foul, and more likely that it turns into a card.',
  },
  cynicalFouler: {
    name: 'Cynical fouler',
    description: "Boosts the team's gamesmanship effectiveness.",
  },
  sharpshooter: {
    name: 'Sharpshooter',
    description: 'More likely to be picked as the finisher, and to convert.',
  },
  playmaker: {
    name: 'Playmaker',
    description: 'Increases the chance that a chance becomes a clear chance.',
  },
  wall: {
    name: 'Wall',
    description:
      'Decisive keeper/defender: reduces the opponent conversion rate.',
  },
  dribbler: {
    name: 'Dribbler',
    description: 'Draws more fouls and creates more chances.',
  },
  leader: {
    name: 'Leader',
    description:
      'Better reaction when behind on the scoreboard, better at holding a result, and better at coming from behind.',
  },
};

export function getTraitIntensity(player, slug) {
  const trait = player.traits?.find((t) => t.slug === slug);
  return trait ? trait.intensity : 0;
}

export function sumTraitIntensity(players, slug) {
  return players.reduce((sum, player) => sum + getTraitIntensity(player, slug), 0);
}

/**
 * A sensible default gamesmanship (catimba) level for a drafted lineup,
 * based on the average `cynicalFouler` intensity among the eleven. Callers
 * that don't ask the user to pick a level explicitly (sample scripts, the
 * viewer) should use this instead of a flat hardcoded number — a fixed
 * level ignores the squad entirely, so a team with zero cynicalFouler
 * players (e.g. a "clean" club) ends up visibly time-wasting and picking
 * up needless fouls/cards for no mechanical benefit (see
 * GAMESMANSHIP.TIME_WASTING_EVENT_CHANCE_PER_LEVEL and friends in
 * constants.js, which apply regardless of personnel — only the rhythm-break
 * payoff requires cynicalFouler, so an ill-suited squad still pays the
 * cost of catimba without ever collecting the benefit).
 */
export function defaultGamesmanship(players) {
  const average = sumTraitIntensity(players, 'cynicalFouler') / players.length;
  return Math.max(0, Math.min(3, Math.round(average)));
}

/**
 * Multiplies a list of trait-driven multipliers together and caps the result.
 * Stacking traits/effects on the same computation can otherwise runs away
 * (see CLAUDE.md "Risco de calibragem"), so every combined multiplier used by
 * the match engine must go through this instead of a raw product.
 */
export function combineMultipliers(multipliers, cap) {
  const product = multipliers.reduce((acc, m) => acc * m, 1);
  return Math.min(product, cap);
}
