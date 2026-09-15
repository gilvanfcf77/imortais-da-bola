// Hand-placed (x%, y%) coordinates for PitchLineup.jsx, one set per
// formation in src/engine/formations.js — deliberately not derived
// generically from role alone, so each formation's real shape shows (e.g.
// 4-3-1-2's midfield diamond, 3-5-2's back three with advanced wing-backs),
// which a role-only rule can't capture. y runs 0 (opponent's goal, top) to
// 100 (own goal, bottom), matching how the pitch is drawn in PitchLineup.
//
// Keyed by role, each an array of {x, y} — for a role that appears more
// than once in a formation (e.g. two ZAG), PitchLineup consumes this array
// in the same order the formation's own `slots` list them, left-to-right
// by convention here (e.g. ZAG's first entry is the left-sided one).
//
// Adding a new formation to formations.js needs a matching entry here too
// — there's no fallback, so a missing one would leave that formation's dots
// stacked at the pitch center (see PitchLineup's default coordinate).
export const PITCH_COORDINATES = {
  '4-4-2': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 37, y: 78 },
      { x: 63, y: 78 },
    ],
    LE: [{ x: 15, y: 72 }],
    LD: [{ x: 85, y: 72 }],
    VOL: [{ x: 38, y: 50 }],
    MC: [{ x: 62, y: 50 }],
    ME: [{ x: 15, y: 50 }],
    MD: [{ x: 85, y: 50 }],
    CA: [
      { x: 38, y: 16 },
      { x: 62, y: 16 },
    ],
  },
  '4-3-3': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 37, y: 78 },
      { x: 63, y: 78 },
    ],
    LE: [{ x: 15, y: 72 }],
    LD: [{ x: 85, y: 72 }],
    VOL: [{ x: 50, y: 58 }],
    MC: [{ x: 70, y: 44 }],
    MAT: [{ x: 30, y: 40 }],
    PE: [{ x: 18, y: 18 }],
    PD: [{ x: 82, y: 18 }],
    CA: [{ x: 50, y: 12 }],
  },
  '4-2-4': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 37, y: 78 },
      { x: 63, y: 78 },
    ],
    LE: [{ x: 15, y: 72 }],
    LD: [{ x: 85, y: 72 }],
    VOL: [{ x: 38, y: 52 }],
    MC: [{ x: 62, y: 52 }],
    PE: [{ x: 15, y: 18 }],
    PD: [{ x: 85, y: 18 }],
    CA: [
      { x: 38, y: 14 },
      { x: 62, y: 14 },
    ],
  },
  '5-4-1': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 30, y: 78 },
      { x: 50, y: 80 },
      { x: 70, y: 78 },
    ],
    LE: [{ x: 10, y: 68 }],
    LD: [{ x: 90, y: 68 }],
    VOL: [
      { x: 38, y: 52 },
      { x: 62, y: 52 },
    ],
    ME: [{ x: 15, y: 44 }],
    MD: [{ x: 85, y: 44 }],
    CA: [{ x: 50, y: 14 }],
  },
  '3-5-2': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 30, y: 78 },
      { x: 50, y: 80 },
      { x: 70, y: 78 },
    ],
    LE: [{ x: 10, y: 60 }],
    LD: [{ x: 90, y: 60 }],
    VOL: [{ x: 50, y: 56 }],
    MC: [{ x: 65, y: 42 }],
    MAT: [{ x: 35, y: 36 }],
    CA: [
      { x: 38, y: 14 },
      { x: 62, y: 14 },
    ],
  },
  '3-4-3': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 30, y: 78 },
      { x: 50, y: 80 },
      { x: 70, y: 78 },
    ],
    LE: [{ x: 10, y: 58 }],
    LD: [{ x: 90, y: 58 }],
    VOL: [{ x: 38, y: 48 }],
    MC: [{ x: 62, y: 48 }],
    PE: [{ x: 18, y: 18 }],
    PD: [{ x: 82, y: 18 }],
    CA: [{ x: 50, y: 12 }],
  },
  '4-3-1-2': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 37, y: 78 },
      { x: 63, y: 78 },
    ],
    LE: [{ x: 15, y: 72 }],
    LD: [{ x: 85, y: 72 }],
    VOL: [
      { x: 35, y: 54 },
      { x: 65, y: 54 },
    ],
    MC: [{ x: 50, y: 42 }],
    MAT: [{ x: 50, y: 28 }],
    CA: [
      { x: 38, y: 14 },
      { x: 62, y: 14 },
    ],
  },
  '4-1-4-1': {
    GOL: [{ x: 50, y: 92 }],
    ZAG: [
      { x: 37, y: 78 },
      { x: 63, y: 78 },
    ],
    LE: [{ x: 15, y: 72 }],
    LD: [{ x: 85, y: 72 }],
    VOL: [{ x: 50, y: 58 }],
    ME: [{ x: 15, y: 42 }],
    MC: [{ x: 62, y: 40 }],
    MAT: [{ x: 38, y: 38 }],
    MD: [{ x: 85, y: 42 }],
    CA: [{ x: 50, y: 14 }],
  },
};
