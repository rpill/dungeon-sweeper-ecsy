import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { sceneEvents } from '../events/EventsCenter';
import { AudioEvents, StatusEvents } from '../events/EventNames';
import { audioManager } from '../AudioManager';
import { dataManager } from '../DataManager';
import { gameSaveManager } from '../GameSaveManager';
import { t } from '../i18n';
import Phaser from 'phaser';

export class Menu extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
    this.activeLeaderboardTab = 'score'; // 'score' или 'time'
    this.leaderboardRows = [];
    this.menuGroup = null;
    this.leaderboardGroup = null;
  }

  // Универсальный метод для деактивации пунктов меню
  deactivateMenuItems() {
    if (this.menuGroup) {
      this.menuGroup.list.forEach(child => {
        if (child.type === 'BitmapText') {
          child.setVisible(false);
          if (child.input && child.input.enabled) {
            child.disableInteractive();
          }
        }
      });
    }
    this.input.setDefaultCursor('default');
  }

  // Универсальный метод для активации пунктов меню
  activateMenuItems() {
    if (this.menuGroup) {
      this.menuGroup.list.forEach(child => {
        if (child.type === 'BitmapText') {
          child.setVisible(true);
          if (child.input) {
            child.setInteractive({ useHandCursor: true });
          }
        }
      });
    }
  }

  create() {
    // Сброс всех ссылок на UI-элементы для корректной работы после restart
    this.leaderboardTitle = null;
    this.scoreBtn = null;
    this.timeBtn = null;
    this.leaderboardGroup = null;
    this.menuGroup = null;
    this.leaderboardRows = [];
    this.activeLeaderboardTab = 'score';
    this.leaderboardBackBtn = null;
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

    // --- Группа основного меню ---
    this.menuGroup = this.add.container(0, 0);
    let offsetY = -150;
    // Заголовок
    this.menuGroup.add(
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Castle Sweeper', 35).setOrigin(0.5).setTint(0xffffff)
    );
    offsetY += 130;
    // Кнопка "Продолжить"
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    const hasSavedGame = gameSaveManager.hasSavedGame();
    const canContinue = (gameScene && gameScene.scene.isPaused()) || hasSavedGame;
    if (canContinue) {
      const continueBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('continue'), 25)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true });
      continueBtn.on('pointerdown', () => {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        if (gameScene && gameScene.scene.isPaused()) {
          dataManager.setStatus(StatusEvents.PLAYING);
          this.scene.resume(SCENE_KEYS.GAME);
          this.scene.launch(SCENE_KEYS.UI);
        } else if (hasSavedGame) {
          this.scene.start(SCENE_KEYS.GAME, { loadSavedGame: true });
        }
        this.scene.stop();
      });
      this.menuGroup.add(continueBtn);
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
      gameSaveManager.clearSave();
      this.scene.start(SCENE_KEYS.LEVEL_LOADING);
    });
    this.menuGroup.add(newGameBtn);
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
    this.menuGroup.add(rulesBtn);
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
    this.menuGroup.add(settingsBtn);
    offsetY += 60;
    // Кнопка "Таблица лидеров"
    const leaderboardBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('leaderboard'), 25)
      .setOrigin(0.5)
      .setTint(0xffff00)
      .setInteractive({ useHandCursor: true });
    leaderboardBtn.on('pointerdown', () => {
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      this.showLeaderboard();
    });
    this.menuGroup.add(leaderboardBtn);
    // --- Группа таблицы лидеров ---
    this.leaderboardGroup = this.add.container(0, 0);
    this.leaderboardGroup.setVisible(false);
    // Фон и затемнение для таблицы лидеров
    this.leaderboardBg = this.add.image(centerX, centerY, 'menu_background').setDepth(0);
    this.leaderboardRect = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55).setOrigin(0.5).setDepth(0);
    this.leaderboardGroup.add([this.leaderboardBg, this.leaderboardRect]);
    // Заголовок и вкладки будут добавляться в renderLeaderboardTabs
    // ---
    // Сигнализируем о готовности меню для LoadingAPI только один раз за сессию
    if (!window._menuReadyCalled && window.onMenuReady) {
      window.onMenuReady();
      window._menuReadyCalled = true;
    }
  }

  showAudioSettings() {
    // Скрываем все кнопки меню и отключаем интерактивность
    this.deactivateMenuItems();

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
      // Восстанавливаем видимость и интерактивность пунктов меню
      this.activateMenuItems();
      // Перезапускаем сцену
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
    // Скрываем все кнопки меню и отключаем интерактивность
    this.deactivateMenuItems();

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

  async showLeaderboard() {
    // Скрываем все кнопки меню и отключаем интерактивность
    this.deactivateMenuItems();
    this.leaderboardGroup.setVisible(true);
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    // Проверяем авторизацию
    let player = null;
    if (window.ysdk && window.ysdk.getPlayer) {
      try {
        player = await window.ysdk.getPlayer();
      } catch (e) {}
    }
    if (!player || !player.isAuthorized || !player.isAuthorized()) {
      // Неавторизованный пользователь: показываем только локальные рекорды
      this.renderLocalLeaderboard(centerX, centerY);
      return;
    }
    // Авторизованный — стандартная логика
    if (!this.leaderboardTitle || !this.scoreBtn || !this.timeBtn) {
      this.renderLeaderboardTabs();
    }
    this.leaderboardTitle.setVisible(true);
    if (!this.leaderboardBackBtn) {
      this.leaderboardBackBtn = this.add.bitmapText(centerX, centerY + 200, 'ui', t('back'), 20)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          // Восстанавливаем видимость и интерактивность пунктов меню
          this.activateMenuItems();
          this.leaderboardGroup.setVisible(false);
        });
      this.leaderboardGroup.add(this.leaderboardBackBtn);
    }
    this.leaderboardBackBtn.setVisible(true);
    this.switchLeaderboardTab(this.activeLeaderboardTab);
  }

  renderLocalLeaderboard(centerX, centerY) {
    // Очищаем старые строки
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    // Удаляем старый заголовок, если есть
    if (this.leaderboardTitle) {
      this.leaderboardTitle.destroy();
      this.leaderboardTitle = null;
    }
    // Заголовок
    this.leaderboardTitle = this.add.bitmapText(centerX, centerY - 180, 'ui', t('leaderboard'), 25).setOrigin(0.5);
    this.leaderboardGroup.add(this.leaderboardTitle);
    this.leaderboardTitle.setVisible(true);
    // Получаем локальные рекорды
    const bestTime = Number(localStorage.getItem('bestTime') || 0);
    const totalScore = Number(localStorage.getItem('totalScore') || 0);
    // Показываем две строки: BestTime и TotalScore
    let y = centerY - 80;
    let bestTimeStr = '-';
    if (bestTime) {
      bestTimeStr = formatTime(bestTime / 1000);
    }
    const bestTimeText = this.add.bitmapText(centerX, y, 'ui', `${t('bestTime')}: ${bestTimeStr}`, 22).setOrigin(0.5);
    this.leaderboardGroup.add(bestTimeText);
    this.leaderboardRows.push(bestTimeText);
    y += 40;
    const totalScoreText = this.add.bitmapText(centerX, y, 'ui', `${t('totalScore')}: ${totalScore}`, 22).setOrigin(0.5);
    this.leaderboardGroup.add(totalScoreText);
    this.leaderboardRows.push(totalScoreText);
    y += 80;
    // Описание и кнопка авторизации
    const desc = this.add.bitmapText(centerX, y, 'ui', t('leaderboardAuthDescription'), 11)
      .setOrigin(0.5)
      .setMaxWidth(400)
      .setLineSpacing(12);
    this.leaderboardGroup.add(desc);
    this.leaderboardRows.push(desc);
    y += 80;
    const authBtn = this.add.bitmapText(centerX, y, 'ui', t('leaderboardAuthButton'), 20)
      .setOrigin(0.5)
      .setTint(0xffff00)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        if (window.ysdk && window.ysdk.auth) {
          await window.ysdk.auth.openAuthDialog();
          // После авторизации — синхронизируем локальные данные
          await this.syncLocalStatsWithServer();
          // Обновляем таблицу
          this.showLeaderboard();
        }
      });
    this.leaderboardGroup.add(authBtn);
    this.leaderboardRows.push(authBtn);
    // Кнопка назад
    if (!this.leaderboardBackBtn) {
      this.leaderboardBackBtn = this.add.bitmapText(centerX, centerY + 200, 'ui', t('back'), 20)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.leaderboardGroup.setVisible(false);
        });
      this.leaderboardGroup.add(this.leaderboardBackBtn);
    }
    this.leaderboardBackBtn.setVisible(true);
  }

  async syncLocalStatsWithServer() {
    // Получаем локальные рекорды
    const bestTime = Number(localStorage.getItem('bestTime') || 0);
    const totalScore = Number(localStorage.getItem('totalScore') || 0);
    if (!window.ysdk || !window.ysdk.leaderboards) return;
    // Синхронизируем BestTime
    if (bestTime) {
      try {
        const entry = await window.ysdk.leaderboards.getPlayerEntry('BestTime');
        if (!entry || bestTime < entry.score) {
          await window.ysdk.leaderboards.setScore('BestTime', bestTime);
        }
      } catch (err) {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          await window.ysdk.leaderboards.setScore('BestTime', bestTime);
        }
      }
    }
    // Синхронизируем TotalScore
    if (totalScore) {
      try {
        const entry = await window.ysdk.leaderboards.getPlayerEntry('TotalScore');
        const newScore = (entry && typeof entry.score === 'number' ? entry.score : 0) + totalScore;
        await window.ysdk.leaderboards.setScore('TotalScore', newScore);
      } catch (err) {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          await window.ysdk.leaderboards.setScore('TotalScore', totalScore);
        }
      }
    }
    // Очищаем локальные данные
    localStorage.removeItem('bestTime');
    localStorage.removeItem('totalScore');
  }

  renderLeaderboardTabs() {
    // Удаляем старый заголовок, если есть
    if (this.leaderboardTitle) {
      this.leaderboardTitle.destroy();
      this.leaderboardTitle = null;
    }
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    // Заголовок
    const titleY = centerY - 250;
    this.leaderboardTitle = this.add.bitmapText(centerX, titleY, 'ui', t('leaderboard'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(10);
    this.leaderboardGroup.add(this.leaderboardTitle);
    // Кнопки под заголовком
    const btnY = titleY + 70;
    const btnOffset = 130;
    this.scoreBtn = this.add.bitmapText(centerX - btnOffset, btnY, 'ui', t('leaderboardByScore'), 22)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    this.scoreBtn.on('pointerdown', () => {
      if (this.activeLeaderboardTab !== 'score') {
        this.switchLeaderboardTab('score');
      }
    });
    this.leaderboardGroup.add(this.scoreBtn);
    this.timeBtn = this.add.bitmapText(centerX + btnOffset, btnY, 'ui', t('leaderboardByTime'), 22)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    this.timeBtn.on('pointerdown', () => {
      if (this.activeLeaderboardTab !== 'time') {
        this.switchLeaderboardTab('time');
      }
    });
    this.leaderboardGroup.add(this.timeBtn);
    this.scoreBtn.setTint(this.activeLeaderboardTab === 'score' ? 0xffff00 : 0xffffff);
    this.timeBtn.setTint(this.activeLeaderboardTab === 'time' ? 0xffff00 : 0xffffff);
  }

  switchLeaderboardTab(tab) {
    this.activeLeaderboardTab = tab;
    if (this.scoreBtn && this.timeBtn) {
      this.scoreBtn.setTint(this.activeLeaderboardTab === 'score' ? 0xffff00 : 0xffffff);
      this.timeBtn.setTint(this.activeLeaderboardTab === 'time' ? 0xffff00 : 0xffffff);
    }
    this.renderLeaderboardContent();
  }

  renderLeaderboardContent() {
    // Удаляем старые строки таблицы
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    const tab = this.activeLeaderboardTab;
    const leaderboardName = tab === 'score' ? 'TotalScore' : 'BestTime';
    if (window.ysdk && window.ysdk.leaderboards) {
      window.ysdk.leaderboards.getEntries(leaderboardName, { quantityTop: 10, includeUser: true }).then(scoreRes => {
        window.ysdk.getPlayer().then(player => {
          const userId = player && player.getUniqueID ? player.getUniqueID() : null;
          this.renderLeaderboardGeneric(tab, scoreRes, userId);
        });
      });
    }
  }

  renderLeaderboardGeneric(tab, scoreRes, userId) {
    // Удаляем старые строки таблицы
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const width = this.cameras.main.width;
    let offsetY = -130;
    // Заголовки
    const xRank = 50;
    const xName = 100;
    const xScore = width - 50;
    const xTime = width - 50;
    let y = centerY + offsetY;
    this.leaderboardRows = [];
    this.leaderboardRows.push(
      this.add.bitmapText(xRank, y, 'ui', '#', 15).setOrigin(0, 0.5).setTint(0xaaaaaa).setDepth(5)
    );
    this.leaderboardRows.push(
      this.add.bitmapText(xName, y, 'ui', t('playerName'), 15).setOrigin(0, 0.5).setTint(0xaaaaaa).setDepth(5)
    );
    if (tab === 'score') {
      this.leaderboardRows.push(
        this.add.bitmapText(xScore, y, 'ui', t('score'), 15).setOrigin(1, 0.5).setTint(0xaaaaaa).setDepth(5)
      );
    } else {
      this.leaderboardRows.push(
        this.add.bitmapText(xTime, y, 'ui', t('time'), 15).setOrigin(1, 0.5).setTint(0xaaaaaa).setDepth(5)
      );
    }
    this.leaderboardRows.forEach(row => this.leaderboardGroup.add(row));
    y += 30;
    let userInTop = false;
    scoreRes.entries.forEach((entry) => {
      const name = entry.player.publicName || t('anonymous');
      const value = entry.formattedScore || entry.score;
      const rank = entry.rank;
      const isUser = userId && entry.player.uniqueID === userId;
      if (isUser) userInTop = true;
      const tint = isUser ? 0xffff00 : 0xffffff;
      let row;
      if (tab === 'score') {
        row = this.drawLeaderboardRowScore(centerX, y, rank, name, value, tint);
      } else {
        row = this.drawLeaderboardRowTime(centerX, y, rank, name, value, tint);
      }
      if (Array.isArray(row)) {
        row.forEach(r => this.leaderboardGroup.add(r));
        this.leaderboardRows.push(...row);
      } else {
        this.leaderboardGroup.add(row);
        this.leaderboardRows.push(row);
      }
      y += 25;
    });
    if (!userInTop && userId) {
      window.ysdk.leaderboards.getPlayerEntry(tab === 'score' ? 'TotalScore' : 'BestTime').then(userEntry => {
        const userRank = (typeof userEntry.rank === 'number' && userEntry.rank >= 0) ? userEntry.rank + 1 : 1;
        const value = userEntry.formattedScore || userEntry.score;
        let row;
        if (tab === 'score') {
          row = this.drawLeaderboardRowScore(centerX, y, userRank, userEntry.player.publicName || t('anonymous'), value, 0xffff00);
        } else {
          row = this.drawLeaderboardRowTime(centerX, y, userRank, userEntry.player.publicName || t('anonymous'), value, 0xffff00);
        }
        if (Array.isArray(row)) {
          row.forEach(r => this.leaderboardGroup.add(r));
          this.leaderboardRows.push(...row);
        } else {
          this.leaderboardGroup.add(row);
          this.leaderboardRows.push(row);
        }
      }).catch(err => {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          let row;
          if (tab === 'score') {
            row = this.drawLeaderboardRowScore(centerX, y, 1, t('anonymous'), 0, 0xffff00);
          } else {
            row = this.drawLeaderboardRowTime(centerX, y, 1, t('anonymous'), '-', 0xffff00);
          }
          if (Array.isArray(row)) {
            row.forEach(r => this.leaderboardGroup.add(r));
            this.leaderboardRows.push(...row);
          } else {
            this.leaderboardGroup.add(row);
            this.leaderboardRows.push(row);
          }
        }
      });
    }
  }

  drawLeaderboardRowScore(xCenter, y, rank, name, score, tint = 0xffffff) {
    const width = this.cameras.main.width;
    const xRank = 50;
    const xName = 100;
    const xScore = width - 50;
    const maxNameLen = 20;
    let displayName = name.length > maxNameLen ? name.slice(0, maxNameLen - 3) + '...' : name;
    return [
      this.add.bitmapText(xRank, y, 'ui', rank, 13).setOrigin(0, 0.5).setTint(tint).setDepth(5),
      this.add.bitmapText(xName, y, 'ui', displayName, 10).setOrigin(0, 0.5).setTint(tint).setDepth(5),
      this.add.bitmapText(xScore, y, 'ui', score, 13).setOrigin(1, 0.5).setTint(tint).setDepth(5)
    ];
  }

  drawLeaderboardRowTime(xCenter, y, rank, name, time, tint = 0xffffff) {
    const width = this.cameras.main.width;
    const xRank = 50;
    const xName = 100;
    const xTime = width - 50;
    const maxNameLen = 20;
    let displayName = name.length > maxNameLen ? name.slice(0, maxNameLen - 3) + '...' : name;
    let displayTime = '-';
    if (typeof time === 'number' && !isNaN(time)) {
      displayTime = Math.floor(time / 1000) + 's';
    } else if (typeof time === 'string') {
      displayTime = time;
    }
    return [
      this.add.bitmapText(xRank, y, 'ui', rank, 13).setOrigin(0, 0.5).setTint(tint).setDepth(5),
      this.add.bitmapText(xName, y, 'ui', displayName, 10).setOrigin(0, 0.5).setTint(tint).setDepth(5),
      this.add.bitmapText(xTime, y, 'ui', displayTime, 13).setOrigin(1, 0.5).setTint(tint).setDepth(5)
    ];
  }
}

// Добавить функцию форматирования времени (как в GameOver.js)
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = Phaser.Utils.String.Pad;
  if (h > 0) {
    return `${pad(h, 2, '0', 1)}:${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
  } else {
    return `${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
  }
}
