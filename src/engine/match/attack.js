// Everything that fires from inside an attacking possession: the whiff/save/
// miss/goal resolution itself (resolveAttack), the penalty flow it can hand
// off to (resolvePenalty — also reused by foul.js for a goalkeeper's own
// foul or a wrongly-spotted free kick), and the two situational checks tied
// to an attack's outcome: whether a side just dropped below the minimum
// players to continue (checkMatchAbandoned) and whether an away goal that
// takes the lead should silence the home crowd (maybeSilenceCrowd).

import {
  ATTACK,
  PENALTY,
  TRAIT_WEIGHTS,
  INDIVIDUAL_MULTIPLIER_CAP,
  COMBINED_MULTIPLIER_CAP,
  COMEDY,
  GOALKEEPER,
  DESPERATION,
  WALL_SAVE,
  MATCH,
  GOAL_STYLE,
} from '../constants.js';
import { getTraitIntensity, sumTraitIntensity, combineMultipliers } from '../traits.js';
import { EVENT_TYPES } from '../narration/index.js';
import { clamp, activePlayers, scoreSituation } from './teamState.js';
import { pushEvent } from './events.js';
import {
  pickFinisher,
  pickSetPieceTaker,
  pickGoalkeeper,
  pickTauntVictim,
  pickShortFuseInstigator,
} from './playerPicking.js';
import { refereeBiasMultiplier, sendOff } from './discipline.js';
import {
  wallReductionMultiplier,
  leaderHoldMultiplier,
  leaderComebackMultiplier,
} from './traitEffects.js';
import { GOAL_STYLE_EVENT_TYPE, pickGoalStyle } from './goalStyles.js';

// Bad finishers whiff far more often than legends do. The multiplier is
// exponential rather than linear so it stays smooth in both directions —
// a few overall points below the reference nudges the rate up gently, but
// a truly poor finisher's rate climbs fast — while the clamp keeps a scrub
// from whiffing near-guaranteed and a 99-overall legend whiffing at all.
function whiffChance(finisher) {
  const multiplier = clamp(
    Math.exp((COMEDY.WHIFF_OVERALL_REFERENCE - finisher.overall) * COMEDY.WHIFF_OVERALL_RATE),
    COMEDY.WHIFF_OVERALL_MULTIPLIER_MIN,
    COMEDY.WHIFF_OVERALL_MULTIPLIER_MAX,
  );
  return COMEDY.WHIFF_CHANCE * multiplier;
}

// IFAB Law 3: a match can't continue once a side drops below 7 players.
// Checked once per minute, after that minute's own events have already
// fired, so a card issued mid-minute still gets its own event before the
// match is cut short. What happens to the result after an abandonment isn't
// an IFAB rule — it's a competition-regulation call, but the common
// Brazilian convention (and the one this follows) is: WO for the offending
// side at a fixed MATCH.WO_SCORE, UNLESS the winning side was already ahead
// by that much or more on the field, in which case the real score on the
// board stands instead (no reason to shrink a 5-1 lead down to a 3-0 WO).
// The final score is carried on the MATCH_ABANDONED event itself
// (homeGoals/awayGoals in `meta`) so a caller replaying events one at a
// time for a live scoreboard (MatchScreen.jsx, viewer.html) can snap to it
// instead of trying to track it incrementally.
export function checkMatchAbandoned(homeTeam, awayTeam, minute, score, rng, stats) {
  const homeCount = activePlayers(homeTeam).length;
  const awayCount = activePlayers(awayTeam).length;
  if (homeCount >= MATCH.MIN_PLAYERS_TO_CONTINUE && awayCount >= MATCH.MIN_PLAYERS_TO_CONTINUE)
    return null;

  // Both sides collapsing in the same minute (e.g. a mass brawl sending off
  // players on both teams at once) is a rare edge case — whichever has
  // fewer players is treated as the offending side, ties defaulting to home.
  const offendingSide = homeCount <= awayCount ? 'home' : 'away';
  const offendingTeam = offendingSide === 'home' ? homeTeam : awayTeam;
  const winningSide = offendingSide === 'home' ? 'away' : 'home';
  const winningTeam = offendingSide === 'home' ? awayTeam : homeTeam;

  if (score[winningSide] - score[offendingSide] < MATCH.WO_SCORE) {
    score[winningSide] = MATCH.WO_SCORE;
    score[offendingSide] = 0;
  }

  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.MATCH_ABANDONED,
    offendingSide,
    { team: offendingTeam.config, opponent: winningTeam.config },
    rng,
    { homeGoals: score.home, awayGoals: score.away },
  );
  stats.matchAbandoned = true;
  return { events, offendingSide };
}

// Away-team-only: taunting the home crowd only makes sense for the visiting
// side breaking a hostile stadium's heart, not a home player taunting their
// own fans. Only fires on the specific goal that flips the match into the
// away team's favor, not on every goal scored while already ahead.
export function maybeSilenceCrowd(scoringTeam, tookTheLead, scorer, minute, rng, stats) {
  if (scoringTeam.side !== 'away' || !tookTheLead || !rng.chance(COMEDY.CROWD_SILENCED_CHANCE))
    return [];
  const events = [];
  pushEvent(
    events,
    minute,
    EVENT_TYPES.CROWD_SILENCED,
    scoringTeam.side,
    { player: scorer.name, team: scoringTeam.config },
    rng,
    { playerId: scorer.id },
  );
  stats.crowdSilenced++;
  return events;
}

// `situation` is 'normal' (a real, clear penalty situation — might still be
// waved off, see NOT_GIVEN_CHANCE below), 'phantom' (no foul happened at
// all — a dive, the ball hitting the shooter's chest misread as a handball),
// or 'wrongLocation' (a real foul happened, but outside the area — the
// referee still points to the spot). Both error cases skip NOT_GIVEN_CHANCE:
// the referee has already made up their mind wrongly, there's no second roll
// for whether they also wave it off.
export function resolvePenalty(
  attackingTeam,
  defendingTeam,
  finisher,
  minute,
  score,
  rng,
  stats,
  situation,
) {
  const events = [];
  finisher = pickSetPieceTaker(attackingTeam, rng);

  if (situation === 'phantom') {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_PHANTOM,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config },
      rng,
    );
    stats.penaltiesPhantom++;
  } else if (situation === 'wrongLocation') {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_WRONG_LOCATION,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config },
      rng,
    );
    stats.penaltiesWrongLocation++;
    // Not giving a deserved penalty benefits whoever was defending it.
  } else if (rng.chance(PENALTY.NOT_GIVEN_CHANCE * refereeBiasMultiplier(defendingTeam.side))) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_NOT_GIVEN,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config },
      rng,
    );
    stats.penaltiesNotGiven++;
    return events;
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_AWARDED,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config },
      rng,
    );
    stats.penaltiesAwarded++;
  }

  const keeper = pickGoalkeeper(defendingTeam, rng);
  let mindGamesMultiplier = 1;
  if (rng.chance(PENALTY.GOALKEEPER_MIND_GAMES_CHANCE)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_MIND_GAMES,
      defendingTeam.side,
      { player: finisher.name, keeper: keeper.name },
      rng,
    );
    mindGamesMultiplier = PENALTY.MIND_GAMES_MISS_WEIGHT;
    stats.penaltyMindGames++;
  }

  const wallIntensity = getTraitIntensity(keeper, 'wall');
  const sharpshooterIntensity = getTraitIntensity(finisher, 'sharpshooter');
  // An outfield player standing in for a sent-off goalkeeper (see
  // discipline.js's maybeAssignStandInGoalkeeper) has no idea how to read a
  // penalty — easier for the kicker to convert than against a real keeper.
  const standInMultiplier = defendingTeam.standInGoalkeeperId
    ? GOALKEEPER.STAND_IN_PENALTY_MISS_MULTIPLIER
    : 1;
  const missChance = clamp(
    PENALTY.BASE_MISS_CHANCE *
      (1 + wallIntensity * PENALTY.WALL_MISS_WEIGHT) *
      (1 - sharpshooterIntensity * PENALTY.SHARPSHOOTER_MISS_REDUCTION) *
      mindGamesMultiplier *
      standInMultiplier,
    PENALTY.MISS_CHANCE_FLOOR,
    PENALTY.MISS_CHANCE_CEIL,
  );

  if (rng.chance(missChance)) {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.PENALTY_MISSED,
      attackingTeam.side,
      { player: finisher.name, keeper: keeper.name, team: attackingTeam.config },
      rng,
    );
    stats.penaltiesMissed++;
    return events;
  }

  const wasWinningBefore = scoreSituation(attackingTeam.side, score) === 'winning';
  if (attackingTeam.side === 'home') score.home++;
  else score.away++;
  const tookTheLead = !wasWinningBefore && scoreSituation(attackingTeam.side, score) === 'winning';

  pushEvent(
    events,
    minute,
    EVENT_TYPES.GOAL_PENALTY,
    attackingTeam.side,
    { player: finisher.name, team: attackingTeam.config },
    rng,
    { playerId: finisher.id },
  );
  stats.goalStyles.penalty++;
  events.push(...maybeSilenceCrowd(attackingTeam, tookTheLead, finisher, minute, rng, stats));
  return events;
}

export function resolveAttack(attackingTeam, defendingTeam, minute, score, rng, stats) {
  const events = [];
  const active = activePlayers(attackingTeam);
  if (active.length === 0) return events;

  const finisher = pickFinisher(attackingTeam, rng);
  // A phantom penalty benefits whoever gets awarded it — the attacking side.
  if (rng.chance(PENALTY.PHANTOM_CHANCE * refereeBiasMultiplier(attackingTeam.side))) {
    return resolvePenalty(
      attackingTeam,
      defendingTeam,
      finisher,
      minute,
      score,
      rng,
      stats,
      'phantom',
    );
  }
  if (rng.chance(PENALTY.SITUATION_CHANCE)) {
    return resolvePenalty(
      attackingTeam,
      defendingTeam,
      finisher,
      minute,
      score,
      rng,
      stats,
      'normal',
    );
  }

  const playmakerIntensity = sumTraitIntensity(active, 'playmaker');
  const clearChanceRate = clamp(
    ATTACK.BASE_CLEAR_CHANCE_RATE *
      (1 + playmakerIntensity * TRAIT_WEIGHTS.PLAYMAKER_CLEAR_CHANCE_WEIGHT),
    0,
    0.9,
  );
  const isClearChance = rng.chance(clearChanceRate);
  const baseConversion = isClearChance
    ? ATTACK.CONVERSION_CLEAR_CHANCE
    : ATTACK.CONVERSION_NORMAL_CHANCE;

  const finisherMultiplier = combineMultipliers(
    [1 + getTraitIntensity(finisher, 'sharpshooter') * TRAIT_WEIGHTS.SHARPSHOOTER_FINISH_WEIGHT],
    INDIVIDUAL_MULTIPLIER_CAP,
  );
  const comebackMultiplier = leaderComebackMultiplier(attackingTeam, score);
  const attackMultiplier = combineMultipliers(
    [finisherMultiplier, comebackMultiplier],
    COMBINED_MULTIPLIER_CAP,
  );

  const wallMultiplier = wallReductionMultiplier(defendingTeam);
  const holdMultiplier = leaderHoldMultiplier(defendingTeam, minute, score);
  const defenseMultiplier = wallMultiplier * holdMultiplier;
  // Not a defense number — this is the attacking side choosing to press an
  // outfield player standing in as goalkeeper (see
  // discipline.js's maybeAssignStandInGoalkeeper), so it's kept as its own
  // factor rather than folded into defenseMultiplier above.
  const standInGoalkeeperMultiplier = defendingTeam.standInGoalkeeperId
    ? GOALKEEPER.OPPONENT_ATTACK_BOOST
    : 1;

  const finalChance = clamp(
    baseConversion * attackMultiplier * defenseMultiplier * standInGoalkeeperMultiplier,
    0,
    0.95,
  );

  if (rng.chance(finalChance)) {
    const wasWinningBefore = scoreSituation(attackingTeam.side, score) === 'winning';
    if (attackingTeam.side === 'home') score.home++;
    else score.away++;
    const isFirstGoalForTeam = score[attackingTeam.side] === 1;
    const tookTheLead =
      !wasWinningBefore && scoreSituation(attackingTeam.side, score) === 'winning';

    const style = pickGoalStyle(rng, finisher, Boolean(defendingTeam.standInGoalkeeperId));
    const context = { player: finisher.name, team: attackingTeam.config };
    let goalEventType = GOAL_STYLE_EVENT_TYPE[style];
    let assistPlayerId = null;

    if (style === 'assisted') {
      // The goalkeeper stays eligible here — unlike 'corner' below, a keeper
      // genuinely can set up a goal with a long clearance or a throw, it's
      // just rare — but gets a flat, un-scaled GOALKEEPER_ASSIST_WEIGHT
      // instead of the usual playmaker-scaled formula, so it stays a rare
      // highlight rather than a routine outcome.
      const teammates = activePlayers(attackingTeam).filter((p) => p.id !== finisher.id);
      if (teammates.length === 0) {
        goalEventType = EVENT_TYPES.GOAL;
      } else {
        const assistProvider = rng.pickWeighted(
          teammates,
          teammates.map((p) =>
            p.position === 'GK'
              ? TRAIT_WEIGHTS.GOALKEEPER_ASSIST_WEIGHT
              : 1 + getTraitIntensity(p, 'playmaker') * TRAIT_WEIGHTS.PLAYMAKER_ASSIST_WEIGHT,
          ),
        );
        context.assist = assistProvider.name;
        assistPlayerId = assistProvider.id;
      }
    } else if (style === 'corner') {
      // Excludes the goalkeeper: corners are taken from the opponent's byline,
      // nowhere near their own box, so the keeper is never a candidate —
      // freeKickSpecialist means "trusted with frontal free kicks and
      // penalties" (see pickSetPieceTaker), not "also takes corners". Without
      // this, a keeper with that trait (e.g. Rogério Ceni) could get credited
      // with taking every corner that led to a goal, which never happens in
      // real football.
      //
      // Same fallback as before: with nobody left to have taken the corner
      // (last man standing after red cards), there's no assist to credit —
      // narrate it as a plain goal instead.
      const teammates = activePlayers(attackingTeam).filter(
        (p) => p.id !== finisher.id && p.position !== 'GK',
      );
      if (teammates.length === 0) {
        goalEventType = EVENT_TYPES.GOAL;
      } else {
        const kicker = rng.pickWeighted(
          teammates,
          teammates.map(
            (p) =>
              1 +
              getTraitIntensity(p, 'playmaker') * TRAIT_WEIGHTS.PLAYMAKER_ASSIST_WEIGHT +
              getTraitIntensity(p, 'freeKickSpecialist') *
                TRAIT_WEIGHTS.SET_PIECE_SPECIALIST_WEIGHT,
          ),
        );
        context.assist = kicker.name;
        assistPlayerId = kicker.id;
      }
    } else if (style === 'defensiveBlunder') {
      context.victim = pickTauntVictim(defendingTeam, rng).name;
    } else if (style === 'goalkeeperBlunder') {
      context.keeper = pickGoalkeeper(defendingTeam, rng).name;
    } else if (style === 'longShot') {
      // Set unconditionally so both the plain long-shot templates and the
      // deflection ones (which reference {victim}) can share the same pool.
      context.victim = pickTauntVictim(defendingTeam, rng).name;
      if (rng.chance(GOAL_STYLE.LONG_SHOT_REFEREE_DEFLECTION_CHANCE)) {
        goalEventType = EVENT_TYPES.GOAL_REFEREE_DEFLECTION;
        stats.refereeDeflectionGoals++;
      }
    } else if (style === 'plain') {
      // A "Mão de Deus" moment: the finisher used a hand/arm and the
      // referee missed it. Deliberately not gated on any trait — an honest
      // ref not seeing an infraction is luck, not a skill of the scorer's.
      if (rng.chance(GOAL_STYLE.PLAIN_HANDBALL_GOAL_CHANCE)) {
        goalEventType = EVENT_TYPES.GOAL_HANDBALL;
        stats.handballGoals++;
      }
    }

    if (
      style === 'corner' &&
      minute >= DESPERATION.LATE_GAME_MINUTE &&
      scoreSituation(attackingTeam.side, score) === 'losing'
    ) {
      const keeper = pickGoalkeeper(attackingTeam, rng);
      pushEvent(
        events,
        minute,
        EVENT_TYPES.GOALKEEPER_FORWARD,
        attackingTeam.side,
        { keeper: keeper.name, team: attackingTeam.config },
        rng,
      );
      stats.goalkeeperForward++;
    }

    // The plain style's "faz mais um" ("scores another") phrasing only
    // makes sense once the team already has a goal on the board.
    if (goalEventType === EVENT_TYPES.GOAL && !isFirstGoalForTeam) {
      goalEventType = EVENT_TYPES.GOAL_ANOTHER;
    }

    stats.goalStyles[style]++;
    pushEvent(events, minute, goalEventType, attackingTeam.side, context, rng, {
      playerId: finisher.id,
      ...(assistPlayerId ? { assistPlayerId } : {}),
    });
    events.push(...maybeSilenceCrowd(attackingTeam, tookTheLead, finisher, minute, rng, stats));

    // The reversal: for maximum drama this is checked only now, after the
    // goal has already been fully announced and celebrated — not as an
    // alternative to scoring in the first place. Disallowing it benefits
    // whoever was defending, i.e. the side that just conceded.
    //
    // A handball goal gets its own, much higher chance here: unlike the
    // baseline DISALLOWED_GOAL_CHANCE (a blown call — a phantom foul, an
    // imaginary offside), catching this one back is the referee getting it
    // right, just late. There's no video review in this world — just the
    // referee, prompted by a linesman or the losing side's fury, abruptly
    // changing his mind — but a handball this obvious usually gets caught
    // that way anyway. GOAL_HANDBALL surviving all the way to full time
    // should stay the rare exception, not the norm.
    const disallowedChance =
      goalEventType === EVENT_TYPES.GOAL_HANDBALL
        ? COMEDY.HANDBALL_GOAL_DISALLOWED_CHANCE
        : COMEDY.DISALLOWED_GOAL_CHANCE;
    if (rng.chance(disallowedChance * refereeBiasMultiplier(defendingTeam.side))) {
      if (attackingTeam.side === 'home') score.home--;
      else score.away--;
      pushEvent(
        events,
        minute,
        EVENT_TYPES.DISALLOWED_GOAL,
        attackingTeam.side,
        { player: finisher.name, team: attackingTeam.config },
        rng,
      );
      stats.disallowedGoals++;

      const instigator = pickShortFuseInstigator(attackingTeam, rng);
      if (instigator && rng.chance(COMEDY.OFFICIAL_ASSAULT_CHANCE_AFTER_DISALLOWED_GOAL)) {
        pushEvent(
          events,
          minute,
          EVENT_TYPES.OFFICIAL_ASSAULTED,
          attackingTeam.side,
          { player: instigator.name, team: attackingTeam.config },
          rng,
          { playerId: instigator.id, cardType: 'red' },
        );
        events.push(...sendOff(attackingTeam, instigator, minute, rng, stats));
        stats.officialsAssaulted++;
      }
    }

    return events;
  }

  const wallDefenders = activePlayers(defendingTeam).filter(
    (p) => getTraitIntensity(p, 'wall') > 0,
  );
  if (wallDefenders.length > 0 && rng.chance(0.5)) {
    const defenderPlayer = rng.pick(wallDefenders);
    const saveContext = {
      player: finisher.name,
      defender: defenderPlayer.name,
      team: attackingTeam.config,
    };

    if (defenderPlayer.position === 'GK') {
      // Goalkeepers are allowed to use their hands — this is always a clean save.
      pushEvent(events, minute, EVENT_TYPES.WALL_SAVE, attackingTeam.side, saveContext, rng);
    } else if (rng.chance(WALL_SAVE.OUTFIELD_HANDBALL_CHANCE)) {
      // An outfield player isn't allowed to use their hands — this is a
      // penalty situation, resolved exactly like any other one (award vs.
      // not given by referee error, goalkeeper mind games, miss chance).
      pushEvent(
        events,
        minute,
        EVENT_TYPES.HANDBALL_ON_THE_LINE,
        attackingTeam.side,
        saveContext,
        rng,
        {
          playerId: defenderPlayer.id,
        },
      );
      stats.handballsOnTheLine++;
      events.push(
        ...resolvePenalty(
          attackingTeam,
          defendingTeam,
          finisher,
          minute,
          score,
          rng,
          stats,
          'normal',
        ),
      );
    } else {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.GOAL_LINE_CLEARANCE,
        attackingTeam.side,
        saveContext,
        rng,
        {
          playerId: defenderPlayer.id,
        },
      );
    }
  } else if (rng.chance(whiffChance(finisher))) {
    // The crowd reacting is always the home crowd — the dominant presence
    // in the stadium in this abstraction. Booing only makes sense directed
    // at the rival: an away finisher gets jeered by the home crowd
    // (WHIFF). A home finisher's own miss instead gets a pained,
    // hands-on-head reaction from their own fans (WHIFF_HOME_MISS) — see
    // narration/ for why that's a separate event type from WHIFF.
    if (attackingTeam.side === 'home') {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.WHIFF_HOME_MISS,
        attackingTeam.side,
        { player: finisher.name, team: attackingTeam.config },
        rng,
      );
    } else {
      pushEvent(
        events,
        minute,
        EVENT_TYPES.WHIFF,
        attackingTeam.side,
        {
          player: finisher.name,
          team: attackingTeam.config,
          crowd: defendingTeam.config,
        },
        rng,
      );
    }
    stats.whiffs++;
  } else {
    pushEvent(
      events,
      minute,
      EVENT_TYPES.CHANCE_MISSED,
      attackingTeam.side,
      { player: finisher.name, team: attackingTeam.config },
      rng,
    );
  }
  return events;
}
