import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, narrate, EVENT_TYPES } from '../../src/engine/index.js';

// narrate() throws only when TEMPLATES has no entry at all for a type (see
// narration.js) — missing context placeholders just render blank, they
// don't throw. So this specifically catches "added an event type but forgot
// to register its templates", the exact class of mistake this project has
// already run into once mid-session (a real event turned out to be present,
// but it took a manual grep to confirm — this makes that check automatic).
test('every event type except PLAYER_SPECIAL has at least one narration template', () => {
  const rng = createRng(1);
  for (const [name, type] of Object.entries(EVENT_TYPES)) {
    if (name === 'PLAYER_SPECIAL') continue; // bespoke per-player templates, not in the shared pool — see narration.js
    assert.doesNotThrow(() => narrate(type, {}, rng), `missing narration template for EVENT_TYPES.${name}`);
  }
});

test('narrate throws for a genuinely unknown event type', () => {
  const rng = createRng(1);
  assert.throws(() => narrate('not-a-real-event-type', {}, rng));
});
