import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class Boot extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload() {
    // Загружаем только критически важные ресурсы для отображения
    this.load.setPath('assets');
    this.load.image('menu_background', 'images/menu-background.png');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    
    // Переходим к основной загрузке
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
} 