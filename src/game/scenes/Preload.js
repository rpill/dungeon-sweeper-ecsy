import * as Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class Preload extends Phaser.Scene {
  constructor() {
    super({
      key: SCENE_KEYS.PRELOAD,
    });
  }

  init() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const barWidth = 300;
    const barHeight = 20;
    
    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    
    this.add.rectangle(centerX, centerY, barWidth, barHeight).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(centerX - barWidth/2 + 2, centerY, 4, barHeight - 4, 0xffffff);
    this.load.on('progress', (progress) => {
      bar.width = 4 + ((barWidth - 4) * progress);
    });
  }

  preload() {
    this.load.setPath('assets');

    this.load.image('hud', 'images/hud.png');
    this.load.spritesheet('tiles', 'images/tiles.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('monsters', 'images/monsters.png', { frameWidth: 48, frameHeight: 48 });
    this.load.image('hero_frame', 'images/hero_frame.png');
    this.load.spritesheet('hero', 'images/hero.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('icons', 'images/icons.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('fx_impact', 'images/uf_FX_impact.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('fx', 'images/uf_FX.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('level_up', 'images/level_up.png', { frameWidth: 64, frameHeight: 60 });
    this.load.image('book', 'images/book.png');

    this.load.bitmapFont('ingame', 'fonts/ingame.png', 'fonts/ingame.xml');
    // this.load.bitmapFont('ingame', 'fonts/just-sans-outline.png', 'fonts/just-sans-outline.xml');
    this.load.bitmapFont('ui', 'fonts/quinque-five.png', 'fonts/quinque-five.xml');

    // Загружаем звуки
    this.load.audio('click', 'audio/click.wav');
    this.load.audio('reveal', 'audio/reveal.wav');
    this.load.audio('denied', 'audio/denied.wav');
    this.load.audio('enemy_dead', 'audio/enemy_dead.wav');
    this.load.audio('player_dead', 'audio/player_dead.wav');
    this.load.audio('explosion', 'audio/explosion.wav');
    this.load.audio('use_item', 'audio/use_item.wav');
    this.load.audio('chest_open', 'audio/chest_open.wav');
    this.load.audio('heal', 'audio/heal.wav');
    this.load.audio('grant_xp', 'audio/grant_xp.wav');
    this.load.audio('grant_xp_max', 'audio/grant_xp_max.wav');
    this.load.audio('level_up', 'audio/level_up.wav');
    this.load.audio('miss', 'audio/miss.wav');
    
    // Загружаем музыку
    this.load.audio('ambient', 'audio/ambient.wav');
    this.load.audio('ambient_win', 'audio/aimbent_win.wav');
  }

  create() {
    this.#createAnimations();
    this.scene.start(SCENE_KEYS.MENU);
  }

  #createAnimations() {
    this.anims.create({
      key: 'can_level_up',
      frames: this.anims.generateFrameNumbers('level_up', { start: 0, end: 6 }),
      frameRate: 7,
      repeat: -1
    });
  }
}
