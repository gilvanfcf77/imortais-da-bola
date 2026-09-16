// Formation definitions. Each slot names a specific role (see
// ROLE_TO_POSITION below for which broad position — GK/CB/FB/MF/FW — that
// role belongs to). A player is eligible for a slot if any entry in their
// own `roles` (see src/data/clubs/*.json) matches that slot's role — see
// draftEleven in draft.js. `position` is denormalized onto each slot at
// definition time so callers never need to look up ROLE_TO_POSITION
// themselves.

// GOL/ZAG have no side split (see DECISOES.md); the rest do, mirroring how
// a real lineup sheet distinguishes left/right and holding/creative roles.
export const ROLE_TO_POSITION = {
  GOL: 'GK',
  ZAG: 'CB',
  LE: 'FB',
  LD: 'FB',
  VOL: 'MF',
  MC: 'MF',
  ME: 'MF',
  MD: 'MF',
  MAT: 'MF',
  PE: 'FW',
  PD: 'FW',
  CA: 'FW',
};

function slot(role) {
  return { role, position: ROLE_TO_POSITION[role] };
}

// Two slots of the same role (e.g. two ZAG) are otherwise indistinguishable
// — nothing about a player placed there says which specific one they
// occupy, only that their `role` is "ZAG". That's fine for counting (how
// many ZAG slots total/filled/open), but not for addressing a SPECIFIC
// slot: a player can't be told apart from "whoever's in the other ZAG
// slot" without it, which breaks moving into that other slot when it's
// empty (there's nothing to swap array order with — see DECISOES.md
// decisions 58/59/60 for the bug this caused) or picking a specific one
// out of several open ones of the same role. `roleSlot` is a 0-based
// index scoped to slots sharing the same role within one formation (the
// first ZAG slot listed above is roleSlot 0, the second is 1) — stamped
// once here so every consumer (the draft engine, SquadScreen's manual
// picks/reposition/swap, PitchLineup's coordinate lookup) shares the same
// stable numbering instead of each inventing its own.
function withRoleSlots(slots) {
  const counts = {};
  return slots.map((s) => {
    const roleSlot = counts[s.role] ?? 0;
    counts[s.role] = roleSlot + 1;
    return { ...s, roleSlot };
  });
}

const RAW_FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('MC'),
      slot('ME'),
      slot('MD'),
      slot('CA'),
      slot('CA'),
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('MC'),
      slot('MAT'),
      slot('PE'),
      slot('PD'),
      slot('CA'),
    ],
  },
  '4-2-4': {
    name: '4-2-4',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('MC'),
      slot('PE'),
      slot('PD'),
      slot('CA'),
      slot('CA'),
    ],
  },
  '5-4-1': {
    name: '5-4-1',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('VOL'),
      slot('ME'),
      slot('MD'),
      slot('CA'),
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('MC'),
      slot('MAT'),
      slot('CA'),
      slot('CA'),
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('MC'),
      slot('PE'),
      slot('PD'),
      slot('CA'),
    ],
  },
  '4-3-1-2': {
    name: '4-3-1-2',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('VOL'),
      slot('MC'),
      slot('MAT'),
      slot('CA'),
      slot('CA'),
    ],
  },
  '4-1-4-1': {
    name: '4-1-4-1',
    slots: [
      slot('GOL'),
      slot('ZAG'),
      slot('ZAG'),
      slot('LD'),
      slot('LE'),
      slot('VOL'),
      slot('ME'),
      slot('MC'),
      slot('MAT'),
      slot('MD'),
      slot('CA'),
    ],
  },
};

export const FORMATIONS = Object.fromEntries(
  Object.entries(RAW_FORMATIONS).map(([name, formation]) => [
    name,
    { ...formation, slots: withRoleSlots(formation.slots) },
  ]),
);

export function totalPlayers(formation) {
  return formation.slots.length;
}
