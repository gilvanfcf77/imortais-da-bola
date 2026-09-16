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
  // IFAB Law 3: a match may not continue if a team has fewer than 7
  // players. Red cards are the only way a side loses players mid-match
  // here (no injury-forced permanent substitutions), so this is checked
  // once per minute in simulateMatch's loop.
  MIN_PLAYERS_TO_CONTINUE: 7,
  // What the recorded result should be after an abandonment isn't an IFAB
  // rule — Law 3 only says the match must stop, not what the score becomes
  // after. This follows the common Brazilian competition-regulation
  // convention: WO for the side that collapsed, fixed at 3x0 for the
  // opponent — UNLESS the opponent was already ahead by 3 or more on the
  // field, in which case that real score stands instead. See
  // checkMatchAbandoned in match.js.
  WO_SCORE: 3,
};

export const SHOOTOUT = {
  // Kicks alternate home/away for this many rounds each before sudden death
  // kicks in if still tied. Standard football shootout format.
  INITIAL_ROUNDS: 5,
};

// attackChance (see simulateMinute in match.js) is BASE * (attacker's
// attack power / defender's defense power) — so a posture's `attack` cuts
// (or boosts) how often ITS OWN side creates chances, while its `defense`
// divides into the OPPONENT's attack power, cutting (or boosting) how often
// THEY create chances. `defensive`'s two numbers are deliberately exact
// reciprocals of each other (0.75 and 1/0.75): that keeps the average goal
// difference genuinely neutral (no side gets a hidden edge from the ratio
// math alone) while still lowering the whole match's scoring intensity —
// which is what actually makes both a win AND a loss harder to reach,
// funneling results toward a draw instead of favoring either side. A first
// attempt (0.85/1.15) picked those two numbers independently and they
// happened to nearly cancel out (0.85 ≈ 1/1.15), so defensive posture had
// almost no effect on the match result at all — caught by simulating 3000+
// paired matches (same seed, same opponent, defensive vs balanced) and
// finding the outcome distribution barely moved. Verified with the same
// method: 3000 paired matches, defensive posture came out with a lower win
// rate AND a lower loss rate than balanced (more draws either way), with a
// real (not noise) edge in not losing — McNemar's test on the paired
// not-lost outcome gave χ²≈8, comfortably past the p<0.05 threshold of
// 3.84. Not run through `npm run calibrate` — that ad-hoc comparison isn't
// part of the standard report yet.
export const POSTURE_MODIFIERS = {
  attacking: { attack: 1.15, defense: 0.9 },
  balanced: { attack: 1.0, defense: 1.0 },
  defensive: { attack: 0.75, defense: 1 / 0.75 },
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
  // A `flopper` manufactures fouls on purpose (see traits.js), so this is
  // deliberately a bit stronger per point than DRIBBLER_OPPONENT_FOUL_WEIGHT
  // above, which is a real dribbler's incidental side effect of beating
  // defenders. Not yet calibrated.
  FLOPPER_OPPONENT_FOUL_WEIGHT: 0.08,
  // Out of ordinary (non-scandalous) fouls, chance the referee stops play
  // for a fairly routine foul instead of letting the advantage law apply —
  // denying the fouled side what would have been a promising, possibly
  // decisive attack. A real foul still happened (unlike PENALTY_PHANTOM,
  // where none did), it's just badly timed officiating. Not yet calibrated.
  ADVANTAGE_IGNORED_CHANCE: 0.0015,
  // How a flopper's dive attempt (see COMEDY.FOUL_PHANTOM_CHANCE_PER_
  // FLOPPER_INTENSITY, which decides IF one is attempted this minute)
  // actually resolves: these two are read as a 3-way split against each
  // other (see resolveFoulPhantom's own doc comment) — caught and carded
  // for simulation, caught with just a talking-to (no card, no foul), or
  // the dive fools the referee and FOUL_PHANTOM goes through as before.
  // Not yet calibrated.
  DIVE_CAUGHT_CARDED_CHANCE: 0.1,
  DIVE_CAUGHT_CHANCE: 0.3,
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

// Once a team has no goalkeeper-position player left on the pitch (their GK
// was sent off), an outfield player is drawn to fill in — see
// EVENT_TYPES.OUTFIELD_PLAYER_IN_GOAL and maybeAssignStandInGoalkeeper in
// match.js. Not yet calibrated.
export const GOALKEEPER = {
  // On top of CARDS.SHORT_HANDED_DEFENSE_PENALTY (which already applies for
  // simply being a player short) — this extra cut is specifically about that
  // one player being an outfielder with no real goalkeeping skill, not about
  // the team being down a man in general.
  STAND_IN_DEFENSE_PENALTY: 0.8,
  // This part isn't the defense getting worse — it's the opposing team
  // noticing the makeshift keeper and deliberately choosing to attack more
  // and shoot from distance more, so it's applied to the attacking side's
  // own chance, not folded into the defending side's numbers above.
  OPPONENT_ATTACK_BOOST: 1.2,
  OPPONENT_LONG_SHOT_WEIGHT: 2.5, // multiplies GOAL_STYLE.WEIGHTS.longShot for the attacking side
  // Multiplies the kicker's miss chance (PENALTY.BASE_MISS_CHANCE and
  // friends, in resolvePenalty and resolvePenaltyShootout's takeKick) when
  // whoever's defending is the stand-in rather than a real goalkeeper — an
  // outfield player has no idea how to read a penalty, so the kicker is
  // more likely to convert. Below 1 on purpose: it makes the kicker miss
  // LESS often, not more.
  STAND_IN_PENALTY_MISS_MULTIPLIER: 0.6,
};

export const GAMESMANSHIP = {
  // Tactical-foul rate increase per gamesmanship level (0-3) — applies
  // regardless of having cynicalFouler players, same as the card risk below.
  TACTICAL_FOUL_RATE_PER_LEVEL: 0.08,
  // Flat card-risk increase per gamesmanship level (0-3), regardless of
  // having cynicalFouler players — the risk always applies.
  CARD_RISK_PER_LEVEL: 0.05,
  // Rhythm-breaking benefit (reduces opponent attack chance this minute).
  // Any team playing for time gets SOME of this, regardless of personnel —
  // in real football, slowing a match down is an ordinary tactical choice
  // any side can make, not a rare personality trait. cynicalFouler is the
  // amplifier on top: a team built around nasty operators does this far
  // more effectively than one just going through the motions. Confirmed via
  // a throwaway simulation (1000 matches, a weak underdog vs. a much
  // stronger side) that gamesmanship 3 with zero cynicalFouler used to make
  // the underdog's win-or-draw rate WORSE than not using gamesmanship at
  // all (44.9% vs. 49.5% baseline) — all cost (extra fouls/cards), no
  // benefit. RHYTHM_BREAK_BASE_PER_LEVEL fixes that floor.
  RHYTHM_BREAK_BASE_PER_LEVEL: 0.07,
  RHYTHM_BREAK_PER_CYNICAL_INTENSITY: 0.02,
  RHYTHM_BREAK_CAP: 0.35,
  TIME_WASTING_EVENT_CHANCE_PER_LEVEL: 0.02, // flavor event, no extra mechanical effect
  // Per-minute chance of a slow throw-in / slow goal kick, same shape as
  // TIME_WASTING_EVENT_CHANCE_PER_LEVEL. Unlike that one, these carry a real
  // risk: see CARDS.BASE_YELLOW_CHANCE + CARD_RISK_PER_LEVEL below, reused
  // as-is for the delay-of-game card chance. Not yet calibrated.
  THROW_IN_DELAY_CHANCE_PER_LEVEL: 0.015,
  GOAL_KICK_DELAY_CHANCE_PER_LEVEL: 0.015,
  // A throw-in is normally taken by whoever's already near the touchline,
  // which in practice is the fullback on that side far more often than
  // anyone else — this weights FB well above the flat weight of 1 every
  // other outfield position gets when resolveThrowInDelay picks who's
  // slow to take it, without making it impossible for a midfielder or
  // forward chasing the ball out of play to be the one who ends up with it.
  THROW_IN_TAKER_FB_WEIGHT: 4,
  // Rolled once right after a team scores, not per minute like the delays
  // above — a much higher base chance makes sense since it's a single shot
  // at the mechanic per goal, not a repeated per-minute risk. Requires an
  // actual cynicalFouler on the pitch (see the cynicalIntensity check at the
  // call site) — a goal alone doesn't buy stalling, same rule as everywhere
  // else gamesmanship shows up.
  GOAL_CELEBRATION_STALL_CHANCE_PER_LEVEL: 0.12,
  // Milking a goal celebration for time only reads as cynical once the
  // match is far enough along to matter; a team doing this after an early
  // goal would just look like a normal celebration, so it's gated the same
  // way TIME_WASTING is (see TIME_WASTING_MIN_MINUTE above).
  GOAL_CELEBRATION_STALL_MIN_MINUTE: 60,
  // TIME_WASTING's flavor (gandulas hiding every ball, a fake medical
  // timeout) only reads as believable once the match is genuinely running
  // out — a team doing that in the 20th minute would look bizarre, not
  // cynical. THROW_IN_DELAY/GOAL_KICK_DELAY are milder and stay ungated —
  // a slow throw-in makes sense from kickoff on if the level was set high.
  TIME_WASTING_MIN_MINUTE: 80,
  // A big underdog nursing a shock lead late doesn't need a manager's
  // pre-match instruction to start playing for time — the players
  // themselves sense they're punching above their weight and instinctively
  // shut the game down. This boosts the EFFECTIVE gamesmanship level (never
  // lowers whatever was actually configured) once a team is winning, this
  // late, against a clearly stronger opponent. Same "holding a result"
  // window as LEADER.LATE_GAME_MINUTE.
  UNDERDOG_LATE_GAME_MINUTE: 70,
  UNDERDOG_OVERALL_GAP: 10, // opponent's average overall must be at least this much higher
  UNDERDOG_INSTINCTIVE_LEVEL: 2,
};

export const TRAIT_WEIGHTS = {
  SHARPSHOOTER_FINISH_WEIGHT: 0.18, // per point of intensity
  // Separate from SHARPSHOOTER_FINISH_WEIGHT above: that one boosts
  // conversion odds once a player already has the ball at their feet, this
  // one boosts how often they get picked to shoot in the first place.
  // ATTACK.FINISHER_WEIGHT gives forwards a 3-vs-1 head start over
  // midfielders purely by position — before this weight existed, a
  // legendary shooting midfielder (a Marcelinho Carioca, a Ricardinho) at
  // max sharpshooter intensity only added 0.54 (3 * the 0.18 above) to
  // that base 1, nowhere near a plain forward's 3, so a great MF finisher
  // would shoot far less than an unremarkable FW just for being a
  // midfielder. At 0.7/point, max intensity (3) now lands at 3.1 —
  // matching a plain forward's shot volume, as it should for a player
  // whose whole trait is being trusted to shoot from deep.
  SHARPSHOOTER_FINISHER_SELECTION_WEIGHT: 0.7, // per point of intensity
  PLAYMAKER_CLEAR_CHANCE_WEIGHT: 0.15, // per point of intensity
  WALL_REDUCTION_PER_INTENSITY: 0.1, // per point of intensity, capped below
  WALL_REDUCTION_CAP: 0.55,
  // Chance a direct free kick in range is actually converted, when the
  // taker (pickFreeKickTaker) has at least 1 point of freeKickSpecialist —
  // multiplied up further per point via FREE_KICK_SPECIALIST_WEIGHT below.
  // When the taker has none, FREE_KICK_GOAL_CHANCE_NO_SPECIALIST applies
  // instead — a real free-kick goal from an ordinary player should be rare,
  // not routine. Not yet calibrated.
  FREE_KICK_GOAL_CHANCE: 0.05,
  FREE_KICK_GOAL_CHANCE_NO_SPECIALIST: 0.0015,
  FREE_KICK_SPECIALIST_WEIGHT: 0.3, // per point of intensity
  SET_PIECE_SPECIALIST_WEIGHT: 1, // extra selection weight per point for corners and penalties
  PLAYMAKER_ASSIST_WEIGHT: 0.5, // extra weight per point of intensity, when picking who gets credited with the assist
  DRIBBLER_INDIVIDUAL_GOAL_WEIGHT: 0.5, // multiplies GOAL_STYLE.WEIGHTS.individual, per point of the scorer's dribbler intensity
  // Flat weight for a goalkeeper being credited with an open-play assist (a
  // long clearance or throw straight into a scoring chance) — well below the
  // baseline 1 an outfield player starts at before any trait bonus, so it
  // stays a rare highlight rather than a routine outcome. Deliberately not
  // scaled by any trait (playmaker or otherwise) — this is about a low
  // baseline chance of a long ball landing right, not creative buildup play.
  // Corners are a separate, stricter case (see the 'corner' branch in
  // resolveAttack): a goalkeeper never takes one, so they're excluded from
  // that pool entirely rather than just heavily deprioritized. Not yet
  // calibrated.
  GOALKEEPER_ASSIST_WEIGHT: 0.08,
  // Extra weight per point of `dribbler`/`flopper` intensity when picking
  // who gets fouled (see playerPicking.js's pickFouledPlayer) — on top of
  // the flat weight of 1 every candidate in the (whole-team, not just
  // defenders) pool starts at. dribbler's weight is lower than flopper's:
  // a dribbler draws real fouls as a side effect of beating defenders,
  // while a flopper's whole point is winning the foul itself, so the same
  // max intensity (3) should stand out more for flopper. Neither
  // calibrated yet.
  DRIBBLER_FOULED_SELECTION_WEIGHT: 0.6,
  FLOPPER_FOULED_SELECTION_WEIGHT: 1,
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
// with a more specific narration (see narration/). Weights are relative
// to each other, not percentages — pickWeighted normalizes them.
export const GOAL_STYLE = {
  WEIGHTS: {
    plain: 25,
    // Base weight for a player with no dribbler intensity — a real solo
    // goal should be a rare highlight, not one in five. Boosted per point of
    // dribbler intensity for the actual finisher, see TRAIT_WEIGHTS.
    // DRIBBLER_INDIVIDUAL_GOAL_WEIGHT and pickGoalStyle() in match.js — a
    // max-intensity dribbler lands back near the old 20/91 (~22%) baseline.
    // Not yet calibrated.
    individual: 8,
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
  // Out of plain goals specifically, chance the finisher actually used a
  // hand/arm and the referee missed it — a "Mão de Deus" moment. Slightly
  // rarer than the referee-deflection fluke above: that one is an honest
  // accident, this one is a stolen goal, so it should feel like the rarer
  // of the two. Not yet calibrated.
  PLAIN_HANDBALL_GOAL_CHANCE: 0.03,
};

// Real refereeing research consistently finds officials skew borderline
// calls toward the home side under crowd pressure — this models that,
// applied only to the referee's own genuinely discretionary calls that the
// engine already has (a penalty given/not given, a card shown/withheld, a
// goal disallowed). It deliberately does NOT touch anything player-driven
// (who commits a foul, who's picked to finish, trait effects) — the bias
// belongs to the referee's judgment, not to how the players themselves
// behave. See refereeBiasMultiplier in match.js. Not yet calibrated.
export const REFEREE = {
  HOME_BIAS: 1.3,
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
  // Whiffing is a blunder, so it should hit lousy finishers far more than
  // legends. WHIFF_CHANCE above is the rate at a "decent squad player"
  // overall (WHIFF_OVERALL_REFERENCE); actual chance scales exponentially
  // by how far the finisher's overall sits from that reference, then gets
  // clamped so a scrub isn't guaranteed to whiff and a 99-overall legend
  // still whiffs occasionally (it's comedy, not a stat sheet).
  WHIFF_OVERALL_REFERENCE: 70,
  WHIFF_OVERALL_RATE: 0.05,
  WHIFF_OVERALL_MULTIPLIER_MIN: 0.15,
  WHIFF_OVERALL_MULTIPLIER_MAX: 3,
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
  // Per-minute chance a flopper fools the referee into a foul that never
  // happened (FOUL_PHANTOM — distinct from the real fouls FOUL.
  // FLOPPER_OPPONENT_FOUL_WEIGHT already generates more of), scaled by the
  // team's total flopper intensity. Not yet calibrated.
  FOUL_PHANTOM_CHANCE_PER_FLOPPER_INTENSITY: 0.001,
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
  // Same reversal mechanic as DISALLOWED_GOAL_CHANCE, but for a GOAL_HANDBALL
  // specifically (see GOAL_STYLE.PLAIN_HANDBALL_GOAL_CHANCE) — there's no
  // video review in this world, but a clear handball is still the kind of
  // thing that usually gets the referee to change his mind (a linesman's
  // flag, the losing side's fury), so most of these should get called back;
  // only the rare survivor becomes a real "Mão de Deus" that stands forever.
  // Not yet calibrated.
  HANDBALL_GOAL_DISALLOWED_CHANCE: 0.65,
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
