import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { AudioEvents } from '../events/EventNames';
import { sceneEvents } from '../events/EventsCenter';
import { audioManager } from '../AudioManager';

export class GameOver extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const pad = Phaser.Utils.String.Pad;
      if (h > 0) {
        return `${pad(h, 2, '0', 1)}:${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      } else {
        return `${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      }
    }

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    const bgColor = data.win ? 0x445f41 : 0xa04f4f;
    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, bgColor, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    let offsetY = -60;
    if (data.win) {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Вы победили!', 15).setOrigin(0.5).setTint(0xffffff);
    } else {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Вы проиграли!', 15).setOrigin(0.5).setTint(0xffffff);
    }
    offsetY += 30;

    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `Время: ${formatTime(data.time)}`, 12).setOrigin(0.5).setTint(0xffffff);
    offsetY += 30;

    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `Счёт: ${data.score}`, 12).setOrigin(0.5).setTint(0xffffff);
    offsetY += 70;

    // Кнопка "В меню"
    const menuBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'В меню', 14)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        console.log('GameOver: нажата кнопка "В меню"');
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
        // Принудительно останавливаем музыку победы
        audioManager.forceStopWinMusic();
        
        // Запускаем обычную музыку если она не играет
        if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
          console.log('GameOver: запускаю обычную музыку');
          audioManager.playMusic();
        }
        
        this.scene.start(SCENE_KEYS.MENU);
      });
  }
}
