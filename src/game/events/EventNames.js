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
  INFO_OPEN: 'game:info_open',
  CHANGED: 'game:changed',
  AWAITING_REVIVE: 'game:awaiting_revive',
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

export const AudioEvents = {
  PLAYER_CLICK: 'audio:player_click',
  PLAYER_REVEAL: 'audio:player_reveal',
  PLAYER_DENIED: 'audio:player_denied',
  ENEMY_DEAD: 'audio:enemy_dead',
  PLAYER_DEAD: 'audio:player_dead',
  EXPLOSION: 'audio:explosion',
  USE_ITEM: 'audio:use_item',
  CHEST_OPEN: 'audio:chest_open',
  HEAL: 'audio:heal',
  GRANT_XP: 'audio:grant_xp',
  GRANT_XP_MAX: 'audio:grant_xp_max',
  LEVEL_UP: 'audio:level_up',
  MISS: 'audio:miss',
  ALERT: 'audio:alert',
  SETTINGS_CHANGED: 'audio:settings_changed',
  STOP_WIN_MUSIC: 'audio:stop_win_music',
}