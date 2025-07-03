import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { sceneEvents } from '../events/EventsCenter';
import { AudioEvents, StatusEvents } from '../events/EventNames';
import { audioManager } from '../AudioManager';
import { dataManager } from '../DataManager';
import { t } from '../i18n';

export class Menu extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create() {
    this.leaderboardCache = null;
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Инициализируем AudioManager если он еще не инициализирован
    if (!audioManager.scene) {
      audioManager.initialize(this);
    }
    // Проверяем и останавливаем музыку победы если она играет
    if (audioManager.winMusic && audioManager.winMusic.isPlaying) {
      audioManager.forceStopWinMusic();
      if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
        audioManager.playMusic();
      }
    }
    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');
    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    bg.setInteractive({ useHandCursor: false });
    bg.on('pointerdown', () => {
      audioManager.onUserInteraction();
    });

    let offsetY = -150;
    // Заголовок
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Castle Sweeper', 35).setOrigin(0.5).setTint(0xffffff);
    offsetY += 130;

    // Кнопка "Продолжить" только если сцена GAME существует и активна
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene && gameScene.scene.isPaused()) {
      const continueBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('continue'), 25)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true });
      continueBtn.on('pointerdown', () => {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        dataManager.setStatus(StatusEvents.PLAYING);
        this.scene.resume(SCENE_KEYS.GAME);
        this.scene.launch(SCENE_KEYS.UI);
        this.scene.stop();
      });
      offsetY += 60;
    }

    // Кнопка "Новая игра"
    const newGameBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('newGame'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    newGameBtn.on('pointerdown', () => {
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      audioManager.stopWinMusic();
      this.scene.start(SCENE_KEYS.LEVEL_LOADING);
    });
    offsetY += 60;

    // Кнопка "Правила"
    const rulesBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('rules'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    rulesBtn.on('pointerdown', () => {
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      this.showRules();
    });
    offsetY += 60;

    // Кнопка "Настройки звука"
    const settingsBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('settings'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => {
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      this.showAudioSettings();
    });
    offsetY += 60;

    // Кнопка "Таблица лидеров" только для авторизованных пользователей, всегда последней
    if (window.ysdk && window.ysdk.getPlayer) {
      window.ysdk.getPlayer().then(player => {
        if (!this.scene.isActive() || this.scene.isSleeping()) return;
        if (player.isAuthorized && player.isAuthorized()) {
          const leaderboardBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('leaderboard'), 25)
            .setOrigin(0.5)
            .setTint(0xffff00)
            .setInteractive({ useHandCursor: true });
          leaderboardBtn.on('pointerdown', () => {
            sceneEvents.emit(AudioEvents.PLAYER_CLICK);
            this.showLeaderboard();
          });
        }
      }).catch((err) => { });
    }

    // Сигнализируем о готовности меню для LoadingAPI только один раз за сессию
    if (!window._menuReadyCalled && window.onMenuReady) {
      window.onMenuReady();
      window._menuReadyCalled = true;
    }
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
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('soundSettings'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff);
    offsetY += 50;

    // Загружаем настройки
    const settings = this.loadAudioSettings();

    // Настройка музыки
    const musicText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', t('music'), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: musicFrame, icon: musicIcon } = this.createToggleButton(centerX + 70, centerY + offsetY, settings.musicEnabled);
    
    // Создаем невидимый прямоугольник для всей строки музыки
    const musicRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // Обработчик для всей строки
    musicRow.on('pointerdown', () => {
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
    const soundText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', t('sound'), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: soundFrame, icon: soundIcon } = this.createToggleButton(centerX + 70, centerY + offsetY, settings.soundEnabled);
    
    // Создаем невидимый прямоугольник для всей строки звуков
    const soundRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // Обработчик для всей строки
    soundRow.on('pointerdown', () => {
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
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('back'), 18)
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
    // Создаем рамку - белый прямоугольник с обводкой (без интерактивности)
    const frame = this.add.rectangle(x, y, 26, 26, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff);

    // Создаем иконку галочки (фрейм 30 из icons) без интерактивности
    const icon = this.add.image(x, y, 'icons', 30)
      .setVisible(enabled); // Показываем только если включено

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
      return settings;
    } catch (error) {
      console.warn('Не удалось загрузить настройки звука:', error);
      return defaultSettings;
    }
  }

  saveAudioSettings(settings) {
    try {
      localStorage.setItem('audioSettings', JSON.stringify(settings));
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
      t('rule1'),
      t('rule2'),
      t('rule3'),
      t('rule4'),
      '',
      t('controls'),
      t('lmb'),
      t('shiftLmbRmb'),
      t('touchHero'),
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
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY + 20, 'ui', t('back'), 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      // Воспроизводим звук клика
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.scene.restart();
    });
  }

  showLeaderboard() {
    // Проверяем кэш через dataManager
    const cache = dataManager.getLeaderboardCache();
    if (cache) {
      this.renderLeaderboard(cache);
      return;
    }
    if (window.ysdk && window.ysdk.leaderboards) {
      window.ysdk.leaderboards.getEntries('TotalScore', { quantityTop: 10, includeUser: true }).then(scoreRes => {
        window.ysdk.getPlayer().then(player => {
          const userId = player && player.getUniqueID ? player.getUniqueID() : null;
          const bestTimePromises = scoreRes.entries.map(entry =>
            window.ysdk.leaderboards.getPlayerEntry('BestTime').then(timeEntry => {
              if (timeEntry && timeEntry.player && timeEntry.player.uniqueID === entry.player.uniqueID) {
                return timeEntry;
              }
              return null;
            }).catch(() => null)
          );
          Promise.all(bestTimePromises).then(times => {
            const data = { scoreRes, userId, times };
            dataManager.setLeaderboardCache(data);
            this.renderLeaderboard(data);
          });
        });
      });
    }
  }

  renderLeaderboard(cache) {
    const { scoreRes, userId, times } = cache;
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const width = this.cameras.main.width;
    let offsetY = -240;
    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('leaderboard'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff);
    offsetY += 60;
    let y = centerY + offsetY;
    // Заголовки по тем же X, что и строки
    const xRank = 50;
    const xName = 100;
    const xScore = centerX + 30;
    const xTime = width - 50;
    this.add.bitmapText(xRank, y, 'ui', '#', 16).setOrigin(0, 0.5).setTint(0xaaaaaa);
    this.add.bitmapText(xName, y, 'ui', t('playerName'), 16).setOrigin(0, 0.5).setTint(0xaaaaaa);
    this.add.bitmapText(xScore, y, 'ui', t('score'), 16).setOrigin(0, 0.5).setTint(0xaaaaaa);
    this.add.bitmapText(xTime, y, 'ui', t('time'), 16).setOrigin(1, 0.5).setTint(0xaaaaaa);
    y += 30;
    let userInTop = false;
    scoreRes.entries.forEach((entry, i) => {
      const name = entry.player.publicName || t('anonymous');
      const score = entry.formattedScore || entry.score;
      const rank = entry.rank;
      let bestTime = '-';
      const timeEntry = times[i];
      if (timeEntry && timeEntry.score) {
        bestTime = (timeEntry.formattedScore || (Math.floor(timeEntry.score / 1000) + 's'));
      }
      const isUser = userId && entry.player.uniqueID === userId;
      if (isUser) userInTop = true;
      const tint = isUser ? 0xffff00 : 0xffffff;
      this.drawLeaderboardRow(centerX, y, rank, name, score, bestTime, tint);
      y += 30;
    });
    if (!userInTop && userId) {
      window.ysdk.leaderboards.getPlayerEntry('TotalScore').then(userEntry => {
        window.ysdk.leaderboards.getPlayerEntry('BestTime').then(userTimeEntry => {
          let bestTime = '-';
          if (userTimeEntry && userTimeEntry.score) {
            bestTime = userTimeEntry.formattedScore || (Math.floor(userTimeEntry.score / 1000) + 's');
          }
          const userRank = (typeof userEntry.rank === 'number' && userEntry.rank >= 0) ? userEntry.rank + 1 : 1;
          this.drawLeaderboardRow(centerX, y, userRank, userEntry.player.publicName || t('anonymous'), userEntry.formattedScore || userEntry.score, bestTime, 0xffff00);
        }).catch(err => {
          const userRank = (typeof userEntry.rank === 'number' && userEntry.rank >= 0) ? userEntry.rank + 1 : 1;
          this.drawLeaderboardRow(centerX, y, userRank, userEntry.player.publicName || t('anonymous'), userEntry.formattedScore || userEntry.score, '-', 0xffff00);
        });
      }).catch(err => {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          this.drawLeaderboardRow(centerX, y, 1, t('anonymous'), 0, '-', 0xffff00);
        }
      });
    }
    this.add.bitmapText(centerX, centerY + 200, 'ui', t('back'), 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        this.scene.restart();
      });
  }

  drawLeaderboardRow(xCenter, y, rank, name, score, bestTime, tint = 0xffffff) {
    const width = this.cameras.main.width;
    const xRank = 50;
    const xName = 100;
    const xScore = xCenter + 30;
    const xTime = width - 50;
    const maxNameLen = 13;
    let displayName = name.length > maxNameLen ? name.slice(0, maxNameLen - 3) + '...' : name;
    this.add.bitmapText(xRank, y, 'ui', rank, 15).setOrigin(0, 0.5).setTint(tint);
    this.add.bitmapText(xName, y, 'ui', displayName, 15).setOrigin(0, 0.5).setTint(tint);
    this.add.bitmapText(xScore, y, 'ui', score, 15).setOrigin(0, 0.5).setTint(tint);
    this.add.bitmapText(xTime, y, 'ui', bestTime, 15).setOrigin(1, 0.5).setTint(tint);
  }
}
