// Every tunable number for the match engine lives here, grouped by concern.
// Calibration means: run scripts/calibration.js, tweak one of these, run
// again with the same seed, and read the difference in the report.

export const MATCH = {
  HALF_MINUTES: 45,
  STOPPAGE_FIRST_HALF: [1, 4], // [min, max] extra minutes, inclusive
  STOPPAGE_SECOND_HALF: [2, 6],
  // When the announced stoppage falls at or below the midpoint of its
  // range, chance the home crowd boos it as too little time — but only
  // while the home side isn't already winning (nothing to complain about
  // if you're ahead). Not yet calibrated.
  STOPPAGE_BOO_CHANCE: 0.3,
};

export const SHOOTOUT = {
  // Kicks alternate home/away for this many rounds each before sudden death
  // kicks in if still tied. Standard football shootout format.
  INITIAL_ROUNDS: 5,
};

export const POSTURE_MODIFIERS = {
  attacking: { attack: 1.15, defense: 0.9 },
  balanced: { attack: 1.0, defense: 1.0 },
  defensive: { attack: 0.85, defense: 1.15 },
};

export const ATTACK = {
  // Base per-minute chance that a team creates an attacking sequence,
  // before scaling by the attack/defense ratio against the opponent.
  BASE_CHANCE_PER_MINUTE: 0.09,
  CHANCE_RANGE: [0.02, 0.28], // clamp after scaling by strength ratio
  BASE_CLEAR_CHANCE_RATE: 0.3, // chance a sequence becomes a "clear chance"
  CONVERSION_CLEAR_CHANCE: 0.34,
  CONVERSION_NORMAL_CHANCE: 0.11,
  FINISHER_WEIGHT: { FW: 3, MF: 1 }, // baseline weight by position when picking a finisher
};

export const FOUL = {
  BASE_CHANCE_PER_MINUTE: 0.07,
  DRIBBLER_OPPONENT_FOUL_WEIGHT: 0.06, // per point of opponent dribbler intensity
};

export const CARDS = {
  // Calibrated (2026-08-29, base seed 20260829, 500 matches): the first pass
  // (0.17 / 0.008 / 0.35) put a red card in 40% of matches, way above real
  // football's ~10%, mostly from short-fuse players collecting two yellows.
  BASE_YELLOW_CHANCE: 0.14,
  BASE_STRAIGHT_RED_CHANCE: 0.005,
  SHORT_FUSE_CARD_WEIGHT: 0.08, // per point of short-fuse intensity
  SHORT_FUSE_OFFENDER_WEIGHT: 0.2, // per point of intensity, when picking the offender
  // A goalkeeper is rarely even in a position to commit a foul (they mostly
  // stay near their own goal), so they should be picked as the offender far
  // less often than an outfield player — independent of PENALTY.
  // GOALKEEPER_FOUL_CHANCE, which only controls what happens on the rare
  // occasion it's them. First pass at 1 (same as everyone else) combined
  // with the new high goalkeeper-foul-becomes-penalty chance produced 1.51
  // penalty situations per match (27.2% of open-play goals) in a 500-match
  // calibration (2026-08-30) — wildly over-frequent. Cut hard.
  GOALKEEPER_OFFENDER_WEIGHT: 0.15,
  // The referee, not the player, becomes reluctant to show a second yellow
  // (which sends the player off) — so fouls that would otherwise draw a card
  // get let go more often once a player is already booked. This is
  // deliberately NOT modeled as the player playing more carefully; it's
  // refereeing leniency. A high red-card rate isn't being chased down to
  // real football's ~10% here — the user considers the current rate fine,
  // even fitting for a knockout cup — this only targets the specific
  // two-independent-yellows-stack-into-a-red inflation. Not yet calibrated.
  LENIENCY_ON_BOOKED_PLAYER: 0.5,
  // Extra defense-only penalty applied on top of the proportional
  // numericFactor cut when a team is down a player — a red card should hurt
  // a team's ability to defend more than its ability to create chances.
  // Verified via calibration (2026-08-30, base seed 20260829, 500 matches,
  // one-sided-red-card matches only): without this (value 1), the average
  // goal margin for the side down a man was ~+0.01 — basically no
  // disadvantage at all. With 0.85, it's ~-0.22 — a real, measurable effect.
  // Not calibrated further than that.
  SHORT_HANDED_DEFENSE_PENALTY: 0.85,
};

export const GAMESMANSHIP = {
  // Tactical-foul rate increase per gamesmanship level (0-3) — applies
  // regardless of having cynicalFouler players, same as the card risk below.
  TACTICAL_FOUL_RATE_PER_LEVEL: 0.08,
  // Flat card-risk increase per gamesmanship level (0-3), regardless of
  // having cynicalFouler players — the risk always applies.
  CARD_RISK_PER_LEVEL: 0.05,
  // Rhythm-breaking benefit (reduces opponent attack chance this minute)
  // ONLY scales with cynicalFouler intensity on the team using gamesmanship.
  // A team with gamesmanship 3 and zero cynicalFouler gets none of this.
  RHYTHM_BREAK_PER_CYNICAL_INTENSITY: 0.02,
  RHYTHM_BREAK_CAP: 0.35,
  TIME_WASTING_EVENT_CHANCE_PER_LEVEL: 0.02, // flavor event, no extra mechanical effect
  // Per-minute chance of a slow throw-in / slow goal kick, same shape as
  // TIME_WASTING_EVENT_CHANCE_PER_LEVEL. Unlike that one, these carry a real
  // risk: see CARDS.BASE_YELLOW_CHANCE + CARD_RISK_PER_LEVEL below, reused
  // as-is for the delay-of-game card chance. Not yet calibrated.
  THROW_IN_DELAY_CHANCE_PER_LEVEL: 0.015,
  GOAL_KICK_DELAY_CHANCE_PER_LEVEL: 0.015,
};

export const TRAIT_WEIGHTS = {
  SHARPSHOOTER_FINISH_WEIGHT: 0.18, // per point of intensity
  PLAYMAKER_CLEAR_CHANCE_WEIGHT: 0.15, // per point of intensity
  WALL_REDUCTION_PER_INTENSITY: 0.1, // per point of intensity, capped below
  WALL_REDUCTION_CAP: 0.55,
  FREE_KICK_GOAL_CHANCE: 0.04, // base chance a foul in range becomes a scored free kick
  FREE_KICK_SPECIALIST_WEIGHT: 0.1, // per point of intensity
  PLAYMAKER_ASSIST_WEIGHT: 0.5, // extra weight per point of intensity, when picking who gets credited with the assist
};

// A `wall` trait's last-ditch save reads very differently depending on who
// makes it: a goalkeeper is allowed to use their hands (EVENT_TYPES.WALL_SAVE
// covers that, unchanged), but an outfield player is not — most of their
// saves are legal clearances off the line, but sometimes it's a handball,
// which hands the situation over to the same resolvePenalty() flow a normal
// penalty situation uses (award/not-given, mind games, miss chance — see
// PENALTY above), since a deliberate goal-line handball is a textbook
// penalty call the referee can still blow. Not yet calibrated.
export const WALL_SAVE = {
  OUTFIELD_HANDBALL_CHANCE: 0.15,
};

// Relative weights for how an open-play goal (i.e. not a free kick, decided
// separately in resolveFoul, and not a penalty, decided separately in
// resolvePenalty) gets narrated. "plain" keeps the original generic GOAL
// text with no extra detail; every other key maps to its own event type
// with a more specific narration (see narration.js). Weights are relative
// to each other, not percentages — pickWeighted normalizes them.
export const GOAL_STYLE = {
  WEIGHTS: {
    plain: 25,
    individual: 20,
    assisted: 20,
    corner: 12,
    // First pass (12) landed at 12.0% of open-play goals (measured via
    // `npm run calibrate`, see logs/) — too frequent for a long-range strike,
    // half of which are narrated as an "incredible volley", one of the
    // rarest goal types in real football. Cut to less than half; not yet
    // re-verified with a fresh calibration run.
    longShot: 5,
    defensiveBlunder: 6,
    goalkeeperBlunder: 3,
  },
  // Out of long-shot goals specifically, chance the ball deflects off the
  // referee on its way in instead of the normal (possibly also deflected-
  // off-a-defender) long-range strike — rare but possible. Not yet
  // calibrated — run `npm run calibrate` and check the "desvio no juiz" line.
  LONG_SHOT_REFEREE_DEFLECTION_CHANCE: 0.04,
};

export const PENALTY = {
  // Chance any attack sequence turns into a clear penalty situation, rolled
  // before the normal shot-conversion math in resolveAttack — see
  // resolvePenalty. Most attacks are still resolved as a normal shot.
  SITUATION_CHANCE: 0.012,
  // Out of fouls committed by a goalkeeper specifically, chance it's resolved
  // as a penalty instead of following the normal foul/card flow — in real
  // football a keeper rarely contests the ball far from their own goal, so
  // almost any foul they commit is inside the area. High on purpose. Not yet
  // calibrated.
  GOALKEEPER_FOUL_CHANCE: 0.85,
  // Out of fouls committed by an outfield player, chance the referee still
  // points to the spot even though the foul happened outside the area — a
  // real foul, just the wrong call on location. Distinct from PHANTOM_CHANCE
  // below, where there was no foul at all. First pass (0.02) landed at
  // 0.272/match in 23.6% of matches — too common. Second pass (0.004,
  // matching PHANTOM_CHANCE) still landed at 5.8% of matches — user asked to
  // cut further. Halved again (2026-08-30, base seed 20260829, 500 matches).
  WRONG_LOCATION_CHANCE: 0.002,
  // Chance a penalty gets awarded that never actually happened — a dive, the
  // ball hitting the shooter's chest read as a handball, etc. Checked
  // independently of (and before) SITUATION_CHANCE, so it doesn't compete
  // with legitimate penalties for the same roll. The injustice mirror image
  // of NOT_GIVEN_CHANCE: there, a real penalty gets waved away; here, a goal
  // that shouldn't count still goes on the scoreboard. Not yet calibrated —
  // run `npm run calibrate` and check the "pênalti fantasma" line.
  PHANTOM_CHANCE: 0.004,
  // Out of clear (legitimate) penalty situations, chance the referee still
  // doesn't give it — same injustice flavor as DISALLOWED_GOAL, but before
  // any kick is even taken.
  NOT_GIVEN_CHANCE: 0.15,
  // Chance the goalkeeper tries to unsettle the shooter (delay, gestures,
  // trash talk) before the kick. Pure flavor plus a mechanical nudge — see
  // MIND_GAMES_MISS_WEIGHT below.
  GOALKEEPER_MIND_GAMES_CHANCE: 0.2,
  // Real-world penalties convert around 75-80% of the time, well below a
  // normal clear chance, so the base miss chance starts noticeably higher.
  BASE_MISS_CHANCE: 0.22,
  WALL_MISS_WEIGHT: 0.06, // per point of the goalkeeper's wall intensity
  SHARPSHOOTER_MISS_REDUCTION: 0.05, // per point of the shooter's sharpshooter intensity
  MIND_GAMES_MISS_WEIGHT: 1.3, // multiplier on the miss chance when mind games happened
  MISS_CHANCE_FLOOR: 0.08,
  MISS_CHANCE_CEIL: 0.6,
};

// "Send everyone forward" desperation, goalkeeper included, on a late set
// piece while behind on the scoreboard. Currently hooked into the free-kick
// chance in resolveFoul (fires regardless of whether it scores) and into a
// corner-style goal in resolveAttack (only when that goal already happened,
// since a corner that doesn't lead to a goal isn't its own situation yet —
// unlike penalties, corners aren't modeled as a standalone event chain).
export const DESPERATION = {
  LATE_GAME_MINUTE: 82, // later than LEADER.LATE_GAME_MINUTE — this is a last-throw-of-the-dice tactic
  // First pass (0.35) landed at ~0.36/match (2026-08-29, base seed 20260829,
  // 500 matches) — far too common for a real desperation move (in real
  // football this is a once-a-season sight, not once every 3 matches). Cut
  // to a fraction to bring the expected rate down to ~0.15/match, in line
  // with the other rare-highlight events. Not re-verified with a fresh
  // calibration run yet — the math is linear (this is a flat per-set-piece
  // roll), but confirm with `npm run calibrate` when convenient.
  CHANCE_ON_SET_PIECE: 0.15, // out of set pieces in that window while losing
  GOAL_CHANCE_WEIGHT: 1.4, // multiplier on the free-kick goal chance when it happens
};

export const INDIVIDUAL_MULTIPLIER_CAP = 1.6; // cap for a single stacked trait multiplier
export const COMBINED_MULTIPLIER_CAP = 2.2; // cap when multiple trait multipliers compound

export const LEADER = {
  LATE_GAME_MINUTE: 70, // "holding a result" only kicks in from this minute on
  HOLD_RESULT_WEIGHT: 0.1, // per point of leader intensity, reduces opponent conversion
  HOLD_RESULT_FLOOR: 0.55, // minimum multiplier after the reduction
  COMEBACK_WEIGHT: 0.12, // per point of leader intensity, boosts own conversion when behind
  COMEBACK_CAP: 1.5,
};

export const COMEDY = {
  // Out of the missed chances that aren't stopped by a wall defender, chance
  // the finisher completely whiffs the ball and falls over instead of just
  // shooting wide — a personal blunder the crowd boos, not a goalkeeper
  // save. First pass (0.08) landed at ~0.7/match — there are simply a lot
  // of missed chances per match, so even a modest per-attempt rate adds up.
  // Cut to a third (2026-08-29, base seed 20260829) to bring it in line with
  // the other highlight-tier events. Re-run landed at ~0.29/match.
  WHIFF_CHANCE: 0.03,
  // Out of the fouls attributed to a shortFuse player, chance it escalates
  // into assaulting the referee (EVENT_TYPES.OFFICIAL_ASSAULTED) instead of
  // a normal card outcome — the other way into that same event is
  // OFFICIAL_ASSAULT_CHANCE_AFTER_DISALLOWED_GOAL, below. Calibrated
  // (2026-08-29, base seed 20260829, 500 matches) to ~1 in 30 matches.
  OFFICIAL_ASSAULT_CHANCE_PER_INTENSITY: 0.006,
  // Per-minute chance of a nutmeg-and-taunt (chapéu, caneta, pedalada...),
  // scaled by the dribbling team's total dribbler intensity. First pass
  // (0.0015) landed ~0.7-0.8/match on the sample pool, which in practice
  // could burst to 3 in a single match — feedback was that felt like too
  // much for a highlight moment. Halved (2026-08-29, base seed 20260829) to
  // bring the average — and the odds of a 3-taunt match — down. Re-run
  // landed at ~0.36/match.
  NUTMEG_TAUNT_CHANCE_PER_INTENSITY: 0.0007,
  // Chance a taunt escalates into a brawl with multiple cards. Calibrated so
  // brawls land in roughly 1 out of every 4-5 matches, not nearly every one.
  BRAWL_CHANCE_AFTER_TAUNT: 0.2,
  BRAWL_CARD_COUNT: [2, 3],
  BRAWL_RED_CARD_CHANCE: 0.08,
  // Per-minute chance of trash talk (comer caju, mandar calar a boca, gesto
  // de "fala demais", gesto de choro), scaled by the taunting team's total
  // shortFuse intensity — pure flavor, no mechanical consequence. Calibrated
  // (2026-08-29, base seed 20260829, 500 matches) to ~0.41/match.
  TRASH_TALK_CHANCE_PER_SHORT_FUSE_INTENSITY: 0.001,
  // Per-minute chance of a player calling an opponent out for a fight,
  // scaled the same way. Actually calling someone out is far more volatile
  // than a nutmeg tease, so it escalates to a brawl much more often — see
  // BRAWL_CHANCE_AFTER_FIGHT_CALLOUT. Calibrated to ~0.27/match, escalating
  // to a brawl about 40% of the time (vs 20% for a nutmeg taunt).
  FIGHT_CALLOUT_CHANCE_PER_SHORT_FUSE_INTENSITY: 0.0006,
  BRAWL_CHANCE_AFTER_FIGHT_CALLOUT: 0.4,
  // Out of the fouls committed by a shortFuse player, chance the foul's
  // narration escalates into something scandalous (torn shirt, ear pull...)
  // instead of a plain foul description. A scandalous foul is blatant enough
  // that the referee is also more likely to card it — see
  // SCANDALOUS_FOUL_CARD_WEIGHT below. Calibrated (2026-08-29, base seed
  // 20260829, 500 matches) to ~0.23 per match, in the same ballpark as
  // brawls (~0.16/match) — a highlight, not a running gag.
  SCANDALOUS_FOUL_CHANCE_PER_SHORT_FUSE_INTENSITY: 0.05,
  SCANDALOUS_FOUL_CARD_WEIGHT: 1.3,
  // Chance a scored goal gets wrongly disallowed — a foul invented at the
  // start of the play, an imaginary offside, or the linesman flagging
  // something nobody else saw. Checked AFTER the goal is fully announced
  // (score already up, style-specific text already narrated), not before —
  // the drama is in taking back something the crowd already celebrated, not
  // in denying it outright. Trait-agnostic: a blown call doesn't care who's
  // on the pitch. Frequency last calibrated (2026-08-29, base seed
  // 20260829, 500 matches) at ~0.14/match under the old before-the-fact
  // trigger point — not re-verified since moving it after the goal.
  DISALLOWED_GOAL_CHANCE: 0.04,
  // Out of disallowed goals, chance a short-fused player on the wronged
  // team snaps and goes after the referee or a linesman — straight red, no
  // question. Requires at least one shortFuse player on the pitch for that
  // team (see pickShortFuseInstigator); a team with none just seethes.
  // "Aumentar quando isso acontece": this is the elevated, flashpoint-only
  // risk — there's no equivalent baseline chance of assaulting an official
  // outside this context. Not yet calibrated.
  OFFICIAL_ASSAULT_CHANCE_AFTER_DISALLOWED_GOAL: 0.12,
  // Out of away-team goals that flip the match from drawing/losing into
  // winning, chance the scorer taunts the home crowd to shut up (hand on
  // the ear, "silence" gesture...). Only fires for the specific goal that
  // takes the lead, not every goal scored while already ahead. Not yet
  // calibrated — run `npm run calibrate` and check the "torcida calada" line.
  CROWD_SILENCED_CHANCE: 0.35,
  // Per-minute chance of a player showboating (embaixadinhas) with keepy-
  // uppies, scaled by the team's total dribbler intensity — only checked in
  // the second half while leading by 2+ goals (see simulateMinute). Not yet
  // calibrated — run `npm run calibrate` and check the "embaixadinhas" line.
  SHOWBOATING_CHANCE_PER_INTENSITY: 0.002,
};

export const INJURY = {
  // Chance any foul causes a severe injury (broken leg or similar) to the
  // fouled player, independent of whatever card the offender gets.
  // Calibrated (2026-08-29, base seed 20260829, 500 matches) to ~0.15/match,
  // about 1 in every 6-7 matches.
  SEVERE_INJURY_CHANCE: 0.01,
  // A foul violent enough to already look scandalous is also more likely to
  // actually hurt someone.
  SCANDALOUS_INJURY_WEIGHT: 2,
  // Out of severe injuries, chance the referee still doesn't card the
  // offender at all — not even a yellow. Short-circuits the normal card
  // logic for that foul. Calibrated to ~0.05/match overall (roughly 1 in 4
  // severe injuries goes fully uncarded, as intended).
  NO_CARD_DESPITE_INJURY_CHANCE: 0.25,
  // The injured player keeps playing hurt for the rest of the match. Flat
  // reduction applied to their overall (not stacked if injured again),
  // which lowers their team's sector strength every time it's recalculated.
  INJURED_OVERALL_PENALTY: 12,
};
