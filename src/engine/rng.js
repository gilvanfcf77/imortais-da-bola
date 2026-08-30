// Seeded RNG (mulberry32). Deterministic: the same seed always produces the
// same sequence, which is essential for calibration — run N matches, tweak a
// constant, run again with the same seed, and know the difference came from
// the tweak, not from randomness.

export function createRng(seed) {
  let state = seed >>> 0;

  function nextFloat() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    /** Float in [0, 1). */
    next() {
      return nextFloat();
    },

    /** true with the given probability (0 to 1). */
    chance(probability) {
      return nextFloat() < probability;
    },

    /** Integer between min and max, both inclusive. */
    int(min, max) {
      return min + Math.floor(nextFloat() * (max - min + 1));
    },

    /** A uniformly random element from the list. */
    pick(list) {
      if (list.length === 0) return undefined;
      return list[this.int(0, list.length - 1)];
    },

    /** A random element weighted by `weights` (same index as `items`). */
    pickWeighted(items, weights) {
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      if (total <= 0) return this.pick(items);
      let target = nextFloat() * total;
      for (let i = 0; i < items.length; i++) {
        target -= weights[i];
        if (target <= 0) return items[i];
      }
      return items[items.length - 1];
    },

    /** Shuffled copy of the list (Fisher-Yates), does not mutate the original. */
    shuffle(list) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
