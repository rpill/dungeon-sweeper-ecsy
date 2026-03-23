import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { sceneEvents } from '../events/EventsCenter';
import { AudioEvents, StatusEvents } from '../events/EventNames';
import { audioManager } from '../AudioManager';
import { dataManager } from '../DataManager';
import { gameSaveManager } from '../GameSaveManager';
import { t } from '../i18n';
import Phaser from 'phaser';
import { yandexGames } from '../platform/YandexGames';

export class Menu extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
    this.activeLeaderboardTab = 'score'; // 'score' РёР»Рё 'time'
    this.leaderboardRows = [];
    this.menuGroup = null;
    this.leaderboardGroup = null;
  }

  // РЈРЅРёРІРµСЂСЃР°Р»СЊРЅС‹Р№ РјРµС‚РѕРґ РґР»СЏ РґРµР°РєС‚РёРІР°С†РёРё РїСѓРЅРєС‚РѕРІ РјРµРЅСЋ
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

  // РЈРЅРёРІРµСЂСЃР°Р»СЊРЅС‹Р№ РјРµС‚РѕРґ РґР»СЏ Р°РєС‚РёРІР°С†РёРё РїСѓРЅРєС‚РѕРІ РјРµРЅСЋ
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
    // РЎР±СЂРѕСЃ РІСЃРµС… СЃСЃС‹Р»РѕРє РЅР° UI-СЌР»РµРјРµРЅС‚С‹ РґР»СЏ РєРѕСЂСЂРµРєС‚РЅРѕР№ СЂР°Р±РѕС‚С‹ РїРѕСЃР»Рµ restart
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

    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј AudioManager РµСЃР»Рё РѕРЅ РµС‰Рµ РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ
    if (!audioManager.scene) {
      audioManager.initialize(this);
    }
    // РџСЂРѕРІРµСЂСЏРµРј Рё РѕСЃС‚Р°РЅР°РІР»РёРІР°РµРј РјСѓР·С‹РєСѓ РїРѕР±РµРґС‹ РµСЃР»Рё РѕРЅР° РёРіСЂР°РµС‚
    if (audioManager.winMusic && audioManager.winMusic.isPlaying) {
      audioManager.forceStopWinMusic();
      if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
        audioManager.playMusic();
      }
    }
    // РЈРґР°Р»СЏРµРј РїСЂРµРґС‹РґСѓС‰РёР№ С„РѕРЅ, РµСЃР»Рё РµСЃС‚СЊ
    if (this.menuBg) {
      this.menuBg.destroy();
      this.menuBg = null;
    }
    // Р¤РѕРЅ РјРµРЅСЋ
    if (window.innerWidth < window.innerHeight) {
      // РњРѕР±РёР»СЊРЅРѕРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ: cover РїРѕ С€РёСЂРёРЅРµ/РІС‹СЃРѕС‚Рµ
      const bgTexture = this.textures.get('menu_background').getSourceImage();
      const scaleX = this.scale.width / bgTexture.width;
      const scaleY = this.scale.height / bgTexture.height;
      const scale = Math.max(scaleX, scaleY);
      this.menuBg = this.add.image(centerX, centerY, 'menu_background').setScale(scale);
    } else {
      // Р”РµСЃРєС‚РѕРї: РєР°Рє Р±С‹Р»Рѕ
      this.menuBg = this.add.image(centerX, centerY, 'menu_background');
    }
    // РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ Р·Р°С‚РµРјРЅСЏСЋС‰РёР№ С„РѕРЅ
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);
    bg.setInteractive({ useHandCursor: false });
    bg.on('pointerdown', () => {
      audioManager.onUserInteraction();
    });

    // --- Р“СЂСѓРїРїР° РѕСЃРЅРѕРІРЅРѕРіРѕ РјРµРЅСЋ ---
    this.menuGroup = this.add.container(0, 0);
    let offsetY = -150;
    // Р—Р°РіРѕР»РѕРІРѕРє
    this.menuGroup.add(
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', 'Castle Sweeper', 35).setOrigin(0.5).setTint(0xffffff)
    );
    offsetY += 130;
    // РљРЅРѕРїРєР° "РџСЂРѕРґРѕР»Р¶РёС‚СЊ"
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
    // РљРЅРѕРїРєР° "РќРѕРІР°СЏ РёРіСЂР°"
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
    // РљРЅРѕРїРєР° "РџСЂР°РІРёР»Р°"
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
    // РљРЅРѕРїРєР° "РќР°СЃС‚СЂРѕР№РєРё Р·РІСѓРєР°"
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
    // РљРЅРѕРїРєР° "РўР°Р±Р»РёС†Р° Р»РёРґРµСЂРѕРІ"
    const leaderboardBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('leaderboard'), 25)
      .setOrigin(0.5)
      .setTint(0xffff00)
      .setInteractive({ useHandCursor: true });
    leaderboardBtn.on('pointerdown', () => {
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      this.showLeaderboard();
    });
    this.menuGroup.add(leaderboardBtn);
    // --- Р“СЂСѓРїРїР° С‚Р°Р±Р»РёС†С‹ Р»РёРґРµСЂРѕРІ ---
    this.leaderboardGroup = this.add.container(0, 0);
    this.leaderboardGroup.setVisible(false);
    // Р¤РѕРЅ Рё Р·Р°С‚РµРјРЅРµРЅРёРµ РґР»СЏ С‚Р°Р±Р»РёС†С‹ Р»РёРґРµСЂРѕРІ
    if (window.innerWidth < window.innerHeight) {
      // РњРѕР±РёР»СЊРЅРѕРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ: cover РїРѕ С€РёСЂРёРЅРµ/РІС‹СЃРѕС‚Рµ
      const bgTexture = this.textures.get('menu_background').getSourceImage();
      const scaleX = this.scale.width / bgTexture.width;
      const scaleY = this.scale.height / bgTexture.height;
      const scale = Math.max(scaleX, scaleY);
      this.leaderboardBg = this.add.image(centerX, centerY, 'menu_background').setScale(scale).setDepth(0);
    } else {
      // Р”РµСЃРєС‚РѕРї: РєР°Рє Р±С‹Р»Рѕ
      this.leaderboardBg = this.add.image(centerX, centerY, 'menu_background').setDepth(0);
    }
    this.leaderboardRect = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55).setOrigin(0.5).setDepth(0);
    this.leaderboardGroup.add([this.leaderboardBg, this.leaderboardRect]);
    // Р—Р°РіРѕР»РѕРІРѕРє Рё РІРєР»Р°РґРєРё Р±СѓРґСѓС‚ РґРѕР±Р°РІР»СЏС‚СЊСЃСЏ РІ renderLeaderboardTabs
    // ---
    // РЎРёРіРЅР°Р»РёР·РёСЂСѓРµРј Рѕ РіРѕС‚РѕРІРЅРѕСЃС‚Рё РјРµРЅСЋ РґР»СЏ LoadingAPI С‚РѕР»СЊРєРѕ РѕРґРёРЅ СЂР°Р· Р·Р° СЃРµСЃСЃРёСЋ
    if (!window._menuReadyCalled && window.onMenuReady) {
      window.onMenuReady();
      window._menuReadyCalled = true;
    }
  }

  showAudioSettings() {
    // РЎРєСЂС‹РІР°РµРј РІСЃРµ РєРЅРѕРїРєРё РјРµРЅСЋ Рё РѕС‚РєР»СЋС‡Р°РµРј РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚СЊ
    this.deactivateMenuItems();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -80;

    // РЈРґР°Р»СЏРµРј РїСЂРµРґС‹РґСѓС‰РёР№ С„РѕРЅ, РµСЃР»Рё РµСЃС‚СЊ
    if (this.menuBg) {
      this.menuBg.destroy();
      this.menuBg = null;
    }
    // Р¤РѕРЅ РјРµРЅСЋ
    if (window.innerWidth < window.innerHeight) {
      // РњРѕР±РёР»СЊРЅРѕРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ: cover РїРѕ С€РёСЂРёРЅРµ/РІС‹СЃРѕС‚Рµ
      const bgTexture = this.textures.get('menu_background').getSourceImage();
      const scaleX = this.scale.width / bgTexture.width;
      const scaleY = this.scale.height / bgTexture.height;
      const scale = Math.max(scaleX, scaleY);
      this.menuBg = this.add.image(centerX, centerY, 'menu_background').setScale(scale);
    } else {
      // Р”РµСЃРєС‚РѕРї: РєР°Рє Р±С‹Р»Рѕ
      this.menuBg = this.add.image(centerX, centerY, 'menu_background');
    }

    // РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ Р·Р°С‚РµРјРЅСЏСЋС‰РёР№ С„РѕРЅ
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x293135, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    // Р—Р°РіРѕР»РѕРІРѕРє
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('soundSettings'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff);
    offsetY += 50;

    // Р—Р°РіСЂСѓР¶Р°РµРј РЅР°СЃС‚СЂРѕР№РєРё
    const settings = this.loadAudioSettings();

    // РќР°СЃС‚СЂРѕР№РєР° РјСѓР·С‹РєРё
    const musicText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', t('music'), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: musicFrame, icon: musicIcon } = this.createToggleButton(centerX + 70, centerY + offsetY, settings.musicEnabled);
    
    // РЎРѕР·РґР°РµРј РЅРµРІРёРґРёРјС‹Р№ РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє РґР»СЏ РІСЃРµР№ СЃС‚СЂРѕРєРё РјСѓР·С‹РєРё
    const musicRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // РћР±СЂР°Р±РѕС‚С‡РёРє РґР»СЏ РІСЃРµР№ СЃС‚СЂРѕРєРё
    musicRow.on('pointerdown', () => {
      // Р’РѕСЃРїСЂРѕРёР·РІРѕРґРёРј Р·РІСѓРє РєР»РёРєР°
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      settings.musicEnabled = !settings.musicEnabled;
      this.saveAudioSettings(settings);
      musicIcon.setVisible(settings.musicEnabled);
      
      // РћР±РЅРѕРІР»СЏРµРј AudioManager С‡РµСЂРµР· СЃРѕР±С‹С‚РёСЏ
      sceneEvents.emit(AudioEvents.SETTINGS_CHANGED);
    });
    
    offsetY += 40;

    // РќР°СЃС‚СЂРѕР№РєР° Р·РІСѓРєРѕРІ
    const soundText = this.add.bitmapText(centerX - 100, centerY + offsetY, 'ui', t('sound'), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    
    const { frame: soundFrame, icon: soundIcon } = this.createToggleButton(centerX + 70, centerY + offsetY, settings.soundEnabled);
    
    // РЎРѕР·РґР°РµРј РЅРµРІРёРґРёРјС‹Р№ РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє РґР»СЏ РІСЃРµР№ СЃС‚СЂРѕРєРё Р·РІСѓРєРѕРІ
    const soundRow = this.add.rectangle(centerX, centerY + offsetY, 300, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    
    // РћР±СЂР°Р±РѕС‚С‡РёРє РґР»СЏ РІСЃРµР№ СЃС‚СЂРѕРєРё
    soundRow.on('pointerdown', () => {
      // Р’РѕСЃРїСЂРѕРёР·РІРѕРґРёРј Р·РІСѓРє РєР»РёРєР°
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      settings.soundEnabled = !settings.soundEnabled;
      this.saveAudioSettings(settings);
      soundIcon.setVisible(settings.soundEnabled);
      
      // РћР±РЅРѕРІР»СЏРµРј AudioManager С‡РµСЂРµР· СЃРѕР±С‹С‚РёСЏ
      sceneEvents.emit(AudioEvents.SETTINGS_CHANGED);
    });
    offsetY += 60;

    // РљРЅРѕРїРєР° "РќР°Р·Р°Рґ"
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('back'), 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      // Р’РѕСЃРїСЂРѕРёР·РІРѕРґРёРј Р·РІСѓРє РєР»РёРєР°
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј РІРёРґРёРјРѕСЃС‚СЊ Рё РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚СЊ РїСѓРЅРєС‚РѕРІ РјРµРЅСЋ
      this.activateMenuItems();
      // РџРµСЂРµР·Р°РїСѓСЃРєР°РµРј СЃС†РµРЅСѓ
      this.scene.restart();
    });
  }

  createToggleButton(x, y, enabled) {
    // РЎРѕР·РґР°РµРј СЂР°РјРєСѓ - Р±РµР»С‹Р№ РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє СЃ РѕР±РІРѕРґРєРѕР№ (Р±РµР· РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚Рё)
    const frame = this.add.rectangle(x, y, 26, 26, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff);

    // РЎРѕР·РґР°РµРј РёРєРѕРЅРєСѓ РіР°Р»РѕС‡РєРё (С„СЂРµР№Рј 30 РёР· icons) Р±РµР· РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚Рё
    const icon = this.add.image(x, y, 'icons', 30)
      .setVisible(enabled); // РџРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РІРєР»СЋС‡РµРЅРѕ

    // Р’РѕР·РІСЂР°С‰Р°РµРј РѕР±СЉРµРєС‚ СЃ РѕР±РѕРёРјРё СЌР»РµРјРµРЅС‚Р°РјРё
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
      console.warn('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё Р·РІСѓРєР°:', error);
      return defaultSettings;
    }
  }

  saveAudioSettings(settings) {
    try {
      localStorage.setItem('audioSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё Р·РІСѓРєР°:', error);
    }
  }

  showRules() {
    // РЎРєСЂС‹РІР°РµРј РІСЃРµ РєРЅРѕРїРєРё РјРµРЅСЋ Рё РѕС‚РєР»СЋС‡Р°РµРј РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚СЊ
    this.deactivateMenuItems();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    let offsetY = -120;

    // РЈРґР°Р»СЏРµРј РїСЂРµРґС‹РґСѓС‰РёР№ С„РѕРЅ, РµСЃР»Рё РµСЃС‚СЊ
    if (this.menuBg) {
      this.menuBg.destroy();
      this.menuBg = null;
    }
    // Р¤РѕРЅ РјРµРЅСЋ
    if (window.innerWidth < window.innerHeight) {
      // РњРѕР±РёР»СЊРЅРѕРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ: cover РїРѕ С€РёСЂРёРЅРµ/РІС‹СЃРѕС‚Рµ
      const bgTexture = this.textures.get('menu_background').getSourceImage();
      const scaleX = this.scale.width / bgTexture.width;
      const scaleY = this.scale.height / bgTexture.height;
      const scale = Math.max(scaleX, scaleY);
      this.menuBg = this.add.image(centerX, centerY, 'menu_background').setScale(scale);
    } else {
      // Р”РµСЃРєС‚РѕРї: РєР°Рє Р±С‹Р»Рѕ
      this.menuBg = this.add.image(centerX, centerY, 'menu_background');
    }

    // РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ Р·Р°С‚РµРјРЅСЏСЋС‰РёР№ С„РѕРЅ
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

    // РљРЅРѕРїРєР° "РќР°Р·Р°Рґ"
    const backBtn = this.add.bitmapText(centerX, centerY + offsetY + 20, 'ui', t('back'), 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      // Р’РѕСЃРїСЂРѕРёР·РІРѕРґРёРј Р·РІСѓРє РєР»РёРєР°
      sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      
      this.scene.restart();
    });
  }

  async showLeaderboard() {
    // РЎРєСЂС‹РІР°РµРј РІСЃРµ РєРЅРѕРїРєРё РјРµРЅСЋ Рё РѕС‚РєР»СЋС‡Р°РµРј РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚СЊ
    this.deactivateMenuItems();
    this.leaderboardGroup.setVisible(true);
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    // РџСЂРѕРІРµСЂСЏРµРј Р°РІС‚РѕСЂРёР·Р°С†РёСЋ
    let player = null;
    if (yandexGames.sdk && yandexGames.sdk.getPlayer) {
      try {
        player = await yandexGames.sdk.getPlayer();
      } catch (e) {}
    }
    if (!player || !player.isAuthorized || !player.isAuthorized()) {
      // РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ: РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ Р»РѕРєР°Р»СЊРЅС‹Рµ СЂРµРєРѕСЂРґС‹
      this.renderLocalLeaderboard(centerX, centerY);
      return;
    }
    // РђРІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ вЂ” СЃС‚Р°РЅРґР°СЂС‚РЅР°СЏ Р»РѕРіРёРєР°
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
          // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј РІРёРґРёРјРѕСЃС‚СЊ Рё РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕСЃС‚СЊ РїСѓРЅРєС‚РѕРІ РјРµРЅСЋ
          this.activateMenuItems();
          this.leaderboardGroup.setVisible(false);
        });
      this.leaderboardGroup.add(this.leaderboardBackBtn);
    }
    this.leaderboardBackBtn.setVisible(true);
    this.switchLeaderboardTab(this.activeLeaderboardTab);
  }

  renderLocalLeaderboard(centerX, centerY) {
    // РћС‡РёС‰Р°РµРј СЃС‚Р°СЂС‹Рµ СЃС‚СЂРѕРєРё
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Р№ Р·Р°РіРѕР»РѕРІРѕРє, РµСЃР»Рё РµСЃС‚СЊ
    if (this.leaderboardTitle) {
      this.leaderboardTitle.destroy();
      this.leaderboardTitle = null;
    }
    // Р—Р°РіРѕР»РѕРІРѕРє
    this.leaderboardTitle = this.add.bitmapText(centerX, centerY - 180, 'ui', t('leaderboard'), 25).setOrigin(0.5);
    this.leaderboardGroup.add(this.leaderboardTitle);
    this.leaderboardTitle.setVisible(true);
    // РџРѕР»СѓС‡Р°РµРј Р»РѕРєР°Р»СЊРЅС‹Рµ СЂРµРєРѕСЂРґС‹
    const bestTime = Number(localStorage.getItem('bestTime') || 0);
    const totalScore = Number(localStorage.getItem('totalScore') || 0);
    // РџРѕРєР°Р·С‹РІР°РµРј РґРІРµ СЃС‚СЂРѕРєРё: BestTime Рё TotalScore
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
    // РћРїРёСЃР°РЅРёРµ Рё РєРЅРѕРїРєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё
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
        if (yandexGames.sdk && yandexGames.sdk.auth) {
          await yandexGames.sdk.auth.openAuthDialog();
          // РџРѕСЃР»Рµ Р°РІС‚РѕСЂРёР·Р°С†РёРё вЂ” СЃРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµРј Р»РѕРєР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ
          await this.syncLocalStatsWithServer();
          // РћР±РЅРѕРІР»СЏРµРј С‚Р°Р±Р»РёС†Сѓ
          this.showLeaderboard();
        }
      });
    this.leaderboardGroup.add(authBtn);
    this.leaderboardRows.push(authBtn);
    // РљРЅРѕРїРєР° РЅР°Р·Р°Рґ
    if (!this.leaderboardBackBtn) {
      this.leaderboardBackBtn = this.add.bitmapText(centerX, centerY + 200, 'ui', t('back'), 20)
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.activateMenuItems();
          this.leaderboardGroup.setVisible(false);
        });
      this.leaderboardGroup.add(this.leaderboardBackBtn);
    }
    this.leaderboardBackBtn.setVisible(true);
  }

  async syncLocalStatsWithServer() {
    // РџРѕР»СѓС‡Р°РµРј Р»РѕРєР°Р»СЊРЅС‹Рµ СЂРµРєРѕСЂРґС‹
    const bestTime = Number(localStorage.getItem('bestTime') || 0);
    const totalScore = Number(localStorage.getItem('totalScore') || 0);
    if (!yandexGames.sdk || !yandexGames.sdk.leaderboards) return;
    // РЎРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµРј BestTime
    if (bestTime) {
      try {
        const entry = await yandexGames.sdk.leaderboards.getPlayerEntry('BestTime');
        if (!entry || bestTime < entry.score) {
          await yandexGames.sdk.leaderboards.setScore('BestTime', bestTime);
        }
      } catch (err) {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          await yandexGames.sdk.leaderboards.setScore('BestTime', bestTime);
        }
      }
    }
    // РЎРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµРј TotalScore
    if (totalScore) {
      try {
        const entry = await yandexGames.sdk.leaderboards.getPlayerEntry('TotalScore');
        const newScore = (entry && typeof entry.score === 'number' ? entry.score : 0) + totalScore;
        await yandexGames.sdk.leaderboards.setScore('TotalScore', newScore);
      } catch (err) {
        if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          await yandexGames.sdk.leaderboards.setScore('TotalScore', totalScore);
        }
      }
    }
    // РћС‡РёС‰Р°РµРј Р»РѕРєР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ
    localStorage.removeItem('bestTime');
    localStorage.removeItem('totalScore');
  }

  renderLeaderboardTabs() {
    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Р№ Р·Р°РіРѕР»РѕРІРѕРє, РµСЃР»Рё РµСЃС‚СЊ
    if (this.leaderboardTitle) {
      this.leaderboardTitle.destroy();
      this.leaderboardTitle = null;
    }
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    // Р—Р°РіРѕР»РѕРІРѕРє
    const titleY = centerY - 250;
    this.leaderboardTitle = this.add.bitmapText(centerX, titleY, 'ui', t('leaderboard'), 25)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(10);
    this.leaderboardGroup.add(this.leaderboardTitle);
    // РљРЅРѕРїРєРё РїРѕРґ Р·Р°РіРѕР»РѕРІРєРѕРј
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
    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Рµ СЃС‚СЂРѕРєРё С‚Р°Р±Р»РёС†С‹
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    const tab = this.activeLeaderboardTab;
    const leaderboardName = tab === 'score' ? 'TotalScore' : 'BestTime';
    if (yandexGames.sdk && yandexGames.sdk.leaderboards) {
      yandexGames.sdk.leaderboards.getEntries(leaderboardName, { quantityTop: 10, includeUser: true }).then(scoreRes => {
        yandexGames.sdk.getPlayer().then(player => {
          const userId = player && player.getUniqueID ? player.getUniqueID() : null;
          this.renderLeaderboardGeneric(tab, scoreRes, userId);
        });
      });
    }
  }

  renderLeaderboardGeneric(tab, scoreRes, userId) {
    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Рµ СЃС‚СЂРѕРєРё С‚Р°Р±Р»РёС†С‹
    if (this.leaderboardRows && this.leaderboardRows.length) {
      this.leaderboardRows.forEach(row => row.destroy());
      this.leaderboardRows = [];
    }
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const width = this.cameras.main.width;
    let offsetY = -130;
    // Р—Р°РіРѕР»РѕРІРєРё
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
      yandexGames.sdk.leaderboards.getPlayerEntry(tab === 'score' ? 'TotalScore' : 'BestTime').then(userEntry => {
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

// Р”РѕР±Р°РІРёС‚СЊ С„СѓРЅРєС†РёСЋ С„РѕСЂРјР°С‚РёСЂРѕРІР°РЅРёСЏ РІСЂРµРјРµРЅРё (РєР°Рє РІ GameOver.js)
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

