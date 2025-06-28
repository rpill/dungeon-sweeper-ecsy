export const PlayerEvents = {
  HP_CHANGED: 'player:hp_changed',
  XP_CHANGED: 'player:xp_changed',
  CAN_LEVEL_UP: 'player:can_level_up',
  LEVEL_UP: 'player:level_up',
};

export const StatusEvents = {
  NONE: 'game:none',
  PAUSE: 'game:pause',
  PLAYING: 'game:playing',
  LOSE: 'game:lose',
  WIN: 'game:win',
  GENERATING_LEVEL: 'game:generating_level',
  CHANGED: 'game:changed',
}

export const EffectEvents = {
  MONSTER_HIT: 'effect:monster_hit',
  MINE_EXPLOSION: 'effect:mine_explosion',
  BUTTERFLY_DISAPPEAR: 'effect:butterfly_disappear',
  CHEST_OPEN: 'effect:chest_open',
  SPELL_CAST: 'effect:spell_cast',
  MULTIPLE_SPELL: 'effect:multiple_spell',
  MULTIPLE_ORB: 'effect:multiple_orb',
  MULTIPLE_EXPLOSION: 'effect:multiple_explosion',
}