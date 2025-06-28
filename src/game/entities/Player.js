import { sceneEvents } from '../events/EventsCenter';
import { PlayerEvents } from '../events/EventNames';

export class Player {
  constructor() {
    this.maxHP = 5;
    this.hp = this.maxHP;
    this.xp = 0;
    this.level = 1;
    this.score = 0;
  }

  reset() {
    this.level = 1;
    this.maxHP = 5;
    this.hp = this.maxHP;
  }

  grantXP(xp) {
    const prevCanLevelUp = this.xp >= this.nextLevelXP();
    this.xp += xp;
    this.score += xp;

    sceneEvents.emit(PlayerEvents.XP_CHANGED, { current: this.xp });

    const nowCanLevelUp = this.xp >= this.nextLevelXP();

    if (!prevCanLevelUp && nowCanLevelUp) {
      sceneEvents.emit(PlayerEvents.CAN_LEVEL_UP);
    }
  }

  nextLevelXP() {
    //              1  2  3  4  5   6   7   8   9  10  11  12  13  14  15 (level)
    //              5     6     7       8       9      10      11      12 (hp)
    const table = [0, 4, 5, 7, 9, 9, 10, 12, 12, 12, 15, 18, 21, 21, 25];
    const index = Math.min(this.level, table.length - 1);

    return table[index];
  }

  levelUp() {
    const prevHP = this.hp;

    this.xp -= this.nextLevelXP();
    this.level += 1;
    this.maxHP = Math.min(19, this.maxHP + 1);
    this.hp = this.maxHP;

    sceneEvents.emit(PlayerEvents.HP_CHANGED, {
      previous: prevHP,
      current: this.hp
    });
    sceneEvents.emit(PlayerEvents.XP_CHANGED, { current: this.xp });
    sceneEvents.emit(PlayerEvents.LEVEL_UP);
  }

  heal(amount = null) {
    const prevHP = this.hp;

    if (amount === null) {
      // Полное восстановление HP
      this.hp = this.maxHP;
    } else {
      // Частичное восстановление HP
      this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    sceneEvents.emit(PlayerEvents.HP_CHANGED, {
      previous: prevHP,
      current: this.hp
    });
  }

  takeDamage(amount) {
    const prevHP = this.hp;
    this.hp = this.hp - amount;

    sceneEvents.emit(PlayerEvents.HP_CHANGED, {
      previous: prevHP,
      current: this.hp
    });

    return this.hp < 0;
  }
}