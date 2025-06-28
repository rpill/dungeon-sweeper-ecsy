import { Scene } from 'phaser';
import { sceneEvents } from '../events/EventsCenter';
import { PlayerEvents, StatusEvents } from '../events/EventNames';
import { SCENE_KEYS } from './SceneKeys';
import { dataManager } from '../DataManager';

export class UI extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    this.player = dataManager.player;

    const hudHeight = 80;
    const hudY = this.scale.height;
    const hudWidth = this.scale.width;

    const hudBg = this.add.image(0, hudY, 'hud')
      .setOrigin(0, 1)
      .setDisplaySize(hudWidth, hudHeight);

    this.playerFrame = this.add.sprite(48, hudY - hudHeight / 2, 'hero_frame');
    this.playerPortrait = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'hero');
    this.playerFrame.setInteractive();
    this.playerFrame.on('pointerdown', () => {
      if (dataManager.status !== StatusEvents.PLAYING) return;
      if (this.player.xp >= this.player.nextLevelXP()) {
        this.player.levelUp();
      }
    });

    // HP
    this.playerHP = this.add.sprite(100, hudY - hudHeight / 2 + 1, 'icons', 0);
    this.hpText = this.add.bitmapText(
      114,
      hudY - hudHeight / 2 - 2,
      'ui',
      `${this.player.hp}/${this.player.maxHP}`,
      10
    );

    // XP
    this.playerXP = this.add.sprite(100, hudY - hudHeight / 2 + 20, 'icons', 10);
    this.xpText = this.add.bitmapText(
      114,
      hudY - hudHeight / 2 + 17,
      'ui',
      `${this.player.xp}/${this.player.nextLevelXP()}`,
      10
    );

    const halfHP = Math.floor(this.player.maxHP / 2);
    this.hpText.setText(`${Math.max(0, this.player.hp)}/${this.player.maxHP}`);
    if (this.player.hp === this.player.maxHP) {
      this.playerPortrait.setFrame(0);
      this.playerHP.setFrame(0);
    } else if (this.player.hp >= 1 && this.player.hp <= halfHP) {
      this.playerPortrait.setFrame(1);
      this.playerHP.setFrame(1);
    } else if (this.player.hp === 0) {
      this.playerPortrait.setFrame(1);
      this.playerHP.setFrame(2);
    } else if (this.player.hp < 0) {
      this.playerPortrait.setFrame(2);
      this.playerHP.setFrame(2);
    }
    this.xpText.setText(`${Math.max(0, this.player.xp)}/${this.player.nextLevelXP()}`);

    // Анимация повышения уровня
    this.levelUpAnimation = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'level_up', 0);
    this.levelUpAnimation.setVisible(false);

    // Проверяем, может ли игрок повысить уровень
    if (this.player.xp >= this.player.nextLevelXP()) {
      this.levelUpAnimation.setVisible(true);
      this.levelUpAnimation.play('can_level_up');
    }

    const menuBtn = this.add.bitmapText(hudWidth - 20, hudY - hudHeight / 2, 'ui', 'Меню', 12)
      .setOrigin(1, 0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING) return;
        this.scene.pause(SCENE_KEYS.GAME);
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MENU);
      });

    sceneEvents.on(PlayerEvents.HP_CHANGED, ({ current }) => {
      const halfHP = Math.floor(this.player.maxHP / 2);
      this.hpText.setText(`${Math.max(0, current)}/${this.player.maxHP}`);

      if (current === this.player.maxHP) {
        this.playerPortrait.setFrame(0);
        this.playerHP.setFrame(0);
      } else if (current >= 1 && current <= halfHP) {
        this.playerPortrait.setFrame(1);
        this.playerHP.setFrame(1);
      } else if (current === 0) {
        this.playerPortrait.setFrame(1);
        this.playerHP.setFrame(2);
      } else if (current < 0) {
        this.playerPortrait.setFrame(2);
        this.playerHP.setFrame(2);
        this.levelUpAnimation.setVisible(false);
        this.levelUpAnimation.stop();
      }
    });

    sceneEvents.on(PlayerEvents.XP_CHANGED, ({ current }) => {
      this.xpText.setText(`${Math.max(0, current)}/${this.player.nextLevelXP()}`);
    });

    sceneEvents.on(PlayerEvents.CAN_LEVEL_UP, () => {
      this.levelUpAnimation.setVisible(true);
      this.levelUpAnimation.play('can_level_up');
    });

    sceneEvents.on(PlayerEvents.LEVEL_UP, () => {
      this.levelUpAnimation.setVisible(false);
      this.levelUpAnimation.stop();
      // Дополнительная проверка
      if (this.levelUpAnimation.anims) {
        this.levelUpAnimation.anims.stop();
      }
    });
  }
} 