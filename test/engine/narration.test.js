import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, narrate, EVENT_TYPES } from '../../src/engine/index.js';

// narrate() throws only when TEMPLATES has no entry at all for a type (see
// narration/) — missing context placeholders just render blank, they
// don't throw. So this specifically catches "added an event type but forgot
// to register its templates", the exact class of mistake this project has
// already run into once mid-session (a real event turned out to be present,
// but it took a manual grep to confirm — this makes that check automatic).
test('every event type except PLAYER_SPECIAL has at least one narration template', () => {
  const rng = createRng(1);
  for (const [name, type] of Object.entries(EVENT_TYPES)) {
    if (name === 'PLAYER_SPECIAL') continue; // bespoke per-player templates, not in the shared pool — see narration/
    assert.doesNotThrow(
      () => narrate(type, {}, rng),
      `missing narration template for EVENT_TYPES.${name}`,
    );
  }
});

test('narrate throws for a genuinely unknown event type', () => {
  const rng = createRng(1);
  assert.throws(() => narrate('not-a-real-event-type', {}, rng));
});

// {team}/{opponent}/{crowd} expand into a whole family of placeholders
// (see withClubPlaceholders in narration/index.js): {xOf} ("do"/"da"),
// {xFor} ("pro"/"pra"), {xIn} ("no"/"na"), {xArticle} ("o"/"a" + name), and
// {xArticleCap} (capitalized). A plain string context value stays masculine
// (every real club curated so far); a { name, feminineArticle: true }
// object switches every one of those forms to its feminine contraction —
// this is what lets the shared template pool narrate "do Corinthians" and
// "da Ponte Preta" from the exact same template text.
test('team placeholders default to masculine for a plain string', () => {
  const description = narrate(
    EVENT_TYPES.PENALTY_AWARDED,
    { player: 'Jogador', team: 'Corinthians' },
    createRng(4),
  );
  assert.match(description, /\bpro Corinthians\b/);
});

test('team placeholders switch to feminine contractions for a feminineArticle club', () => {
  const description = narrate(
    EVENT_TYPES.PENALTY_AWARDED,
    { player: 'Jogadora', team: { name: 'Ponte Preta', feminineArticle: true } },
    createRng(4),
  );
  assert.match(description, /\bpra Ponte Preta\b/);
  assert.doesNotMatch(description, /\bpro Ponte Preta\b/);
});

test('{xArticleCap} capitalizes the article for masculine and feminine clubs alike', () => {
  const masculine = narrate(EVENT_TYPES.SHOOTOUT_WINNER, { team: 'Corinthians' }, createRng(3));
  const feminine = narrate(
    EVENT_TYPES.SHOOTOUT_WINNER,
    { team: { name: 'Ponte Preta', feminineArticle: true } },
    createRng(3),
  );
  assert.match(masculine, /\bO Corinthians\b/);
  assert.match(feminine, /\bA Ponte Preta\b/);
});
