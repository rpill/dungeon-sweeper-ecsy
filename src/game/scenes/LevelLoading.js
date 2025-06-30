import { SCENE_KEYS } from './SceneKeys';
import { t } from '../i18n';

const MONSTER_FRAME_COUNT = 129;

export class LevelLoading extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LEVEL_LOADING });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.85);
    this.add.bitmapText(centerX, centerY, 'ui', t('generatingLevel'), 20).setOrigin(0.5);

    const frame = Phaser.Math.Between(0, MONSTER_FRAME_COUNT - 1);
    this.add.sprite(centerX, centerY - 40, 'monsters', frame).setOrigin(0.5);

    this.time.delayedCall(100, async () => {
      this.scene.start(SCENE_KEYS.GAME);
    });
  }
} 