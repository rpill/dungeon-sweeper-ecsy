import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { sceneEvents } from '../events/EventsCenter';
import { AudioEvents } from '../events/EventNames';
import { audioManager } from '../AudioManager';

export class Menu extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -70;

    // Инициализируем AudioManager если он еще не инициализирован
    if (!audioManager.scene) {
      audioManager.initialize(this);
    }
    
    // Проверяем и останавливаем музыку победы если она играет
    if (audioManager.winMusic && audioManager.winMusic.isPlaying) {
      console.log('Menu: останавливаю музыку победы при инициализации');
      audioManager.forceStopWinMusic();
      
      // Запускаем обычную музыку если она не играет
      if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
        console.log('Menu: запускаю обычную музыку');
        audioManager.playMusic();
      }
    }
    
    // Отладочная информация о статусе музыки
    console.log('Menu: статус музыки:', audioManager.getCurrentMusicStatus());

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    
    // Добавляем обработчик клика на фон для первого взаимодействия
    bg.setInteractive({ useHandCursor: false });
    bg.on('pointerdown', () => {
      audioManager.onUserInteraction();
    });

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
        // Воспроизводим звук клика
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
        // При продолжении игры не очищаем музыку, она должна продолжать играть
        
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
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      // Останавливаем только музыку победы, обычную музыку оставляем
      audioManager.stopWinMusic();
      
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
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.showRules();
    });
    offsetY += 40;

    // Кнопка "Настройки звука"
    const settingsBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Настройки', 15)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => {
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.showAudioSettings();
    });
  }

  showAudioSettings() {
    // Скрываем все элементы меню
    this.children.list.forEach(child => {
      if (child.type === 'BitmapText' || child.type === 'Rectangle') {
        child.setVisible(false);
      }
    });

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -80;

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    // Заголовок
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Настройки звука', 18)
      .setOrigin(0.5)
      .setTint(0xffffff);
    offsetY += 50;

    // Загружаем настройки
    const settings = this.loadAudioSettings();

    // Настройка музыки
    const musicText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', 'Музыка', 14)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: musicFrame, icon: musicIcon } = this.createToggleButton(centerX + 50, centerY + offsetY, settings.musicEnabled);
    
    // Создаем невидимый прямоугольник для всей строки музыки
    const musicRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // Обработчик для всей строки
    musicRow.on('pointerdown', () => {
      console.log('Клик по строке музыки');
      
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      settings.musicEnabled = !settings.musicEnabled;
      this.saveAudioSettings(settings);
      musicIcon.setVisible(settings.musicEnabled);
      
      // Обновляем AudioManager через события
      sceneEvents.emit(AudioEvents.SETTINGS_CHANGED);
    });
    
    offsetY += 40;

    // Настройка звуков
    const soundText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', 'Звуки', 14)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: soundFrame, icon: soundIcon } = this.createToggleButton(centerX + 50, centerY + offsetY, settings.soundEnabled);
    
    // Создаем невидимый прямоугольник для всей строки звуков
    const soundRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // Обработчик для всей строки
    soundRow.on('pointerdown', () => {
      console.log('Клик по строке звуков');
      
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      settings.soundEnabled = !settings.soundEnabled;
      this.saveAudioSettings(settings);
      soundIcon.setVisible(settings.soundEnabled);
      
      // Обновляем AudioManager через события
      sceneEvents.emit(AudioEvents.SETTINGS_CHANGED);
    });
    offsetY += 60;

    // Кнопка "Назад"
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Назад', 15)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.scene.restart();
    });
  }

  createToggleButton(x, y, enabled) {
    console.log('Создание кнопки настройки:', { x, y, enabled });
    
    // Создаем рамку - белый прямоугольник с обводкой (без интерактивности)
    const frame = this.add.rectangle(x, y, 26, 26, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff);

    // Создаем иконку галочки (фрейм 30 из icons) без интерактивности
    const icon = this.add.image(x - 2, y + 2, 'icons', 30)
      .setVisible(enabled); // Показываем только если включено

    console.log('Кнопка создана:', { frame: frame.type, icon: icon.type, iconFrame: icon.frame.name });

    // Возвращаем объект с обоими элементами
    return { frame, icon };
  }

  loadAudioSettings() {
    const defaultSettings = {
      musicEnabled: true,
      soundEnabled: true,
      musicVolume: 0.5,
      soundVolume: 0.7
    };

    try {
      const saved = localStorage.getItem('audioSettings');
      const settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
      console.log('Загружены настройки звука:', settings);
      return settings;
    } catch (error) {
      console.warn('Не удалось загрузить настройки звука:', error);
      return defaultSettings;
    }
  }

  saveAudioSettings(settings) {
    try {
      localStorage.setItem('audioSettings', JSON.stringify(settings));
      console.log('Сохранены настройки звука:', settings);
    } catch (error) {
      console.warn('Не удалось сохранить настройки звука:', error);
    }
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
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.scene.restart();
    });
  }
}
