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

export const FORMATIONS = {
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

export function totalPlayers(formation) {
  return formation.slots.length;
}
