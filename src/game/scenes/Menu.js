import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class Menu extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -70;

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    // Заголовок
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Castle Sweeper', 20).setOrigin(0.5).setTint(0xffffff);
    offsetY += 60;

    // Кнопка "Продолжить" только если сцена GAME существует и активна
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene && gameScene.scene.isPaused()) {
      const continueBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Продолжить', 15)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true });
      continueBtn.on('pointerdown', () => {
        this.scene.resume(SCENE_KEYS.GAME);
        this.scene.launch(SCENE_KEYS.UI);
        this.scene.stop();
      });
      offsetY += 40;
    }

    // Кнопка "Новая игра"
    const newGameBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Новая игра', 15)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    newGameBtn.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.GAME);
      this.scene.launch(SCENE_KEYS.UI);
    });
    offsetY += 40;

    // Кнопка "Правила"
    const rulesBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Правила', 15)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    rulesBtn.on('pointerdown', () => {
      this.showRules();
    });
  }

  showRules() {
    // Скрываем все элементы меню
    this.children.list.forEach(child => {
      if (child.type === 'BitmapText' || child.type === 'Rectangle') {
        child.setVisible(false);
      }
    });

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -120;

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    const rules = [
      'Победи дракона и выберись из замка.',
      'Безопасно потерять все сердца.',
      'Враги наносят урон при открытии их клетки.',
      'Число означает суммарный урон врагов вокруг клетки.',
      '',
      'Управление:',
      'ЛКМ - открыть клетку.',
      'SHIFT + ЛКМ или ПКМ - поставить метку.',
      'Коснитесь персонажа, чтобы повысить уровень.',
      'ESC - открыть меню.',
      'R - сгенерировать уровень.'
    ];

    rules.forEach((rule, index) => {
      if (rule === '') {
        offsetY += 20;
      } else {
        this.add.bitmapText(20, centerY + offsetY, 'ui', rule, 11)
          .setOrigin(0, 0.5)
          .setTint(0xffffff);
        offsetY += 25;
      }
    });

    // Кнопка "Назад"
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY + 20, 'ui', 'Назад', 15)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
