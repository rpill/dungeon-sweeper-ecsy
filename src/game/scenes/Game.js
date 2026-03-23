import { dataManager } from '../DataManager';
import { SCENE_KEYS } from './SceneKeys';
import { LevelGenerator } from '../generators/LevelGenerator';
import * as Components from '../ecs/components';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { PlayerInputSystem } from '../ecs/systems/PlayerInputSystem';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { RevealSystem } from '../ecs/systems/RevealSystem';
import { EffectSystem } from '../ecs/systems/EffectSystem';
import { World } from 'ecsy';
import { ItemActivationSystem } from '../ecs/systems/ItemActivationSystem';
import { ChestSystem } from '../ecs/systems/ChestSystem';
import { CollectSystem } from '../ecs/systems/CollectSystem';
import { LootSystem } from '../ecs/systems/LootSystem';
import { WallCombatSystem } from '../ecs/systems/WallCombatSystem';
import { ButterflySystem } from '../ecs/systems/ButterflySystem';
import { StatusEvents } from '../events/EventNames';
import { sceneEvents } from '../events/EventsCenter';
import { EffectManager } from '../EffectManager';
import { audioManager } from '../AudioManager';
import { ObjectCounterSystem } from '../ecs/systems/ObjectCounterSystem';
import { gameSaveManager } from '../GameSaveManager';
import { t } from '../i18n';
import { isMobile } from '../utils';
import { yandexGames } from '../platform/YandexGames';

export class Game extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(data = {}) {
    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РіР»РѕР±Р°Р»СЊРЅС‹Р№ РјРµРЅРµРґР¶РµСЂ Р·РІСѓРєРѕРІ
    audioManager.initialize(this);

    // Р”РѕР±Р°РІР»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРє РїРµСЂРІРѕРіРѕ РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёСЏ
    this.input.on('pointerdown', () => {
      audioManager.onUserInteraction();
    });

    // Р¦РµРЅС‚СЂР°Р»РёР·РѕРІР°РЅРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° Р·Р°РІРµСЂС€РµРЅРёСЏ РёРіСЂС‹
    sceneEvents.on(StatusEvents.CHANGED, this.onStatusChanged, this);
    this.events.on('shutdown', this.onSceneShutdown, this);

    // РћР±СЂР°Р±РѕС‚РєР° СЃРѕР±С‹С‚РёР№ РёРіСЂРѕРєР° РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ
    sceneEvents.on('player:hp_changed', this.onPlayerChanged, this);
    sceneEvents.on('player:xp_changed', this.onPlayerChanged, this);
    sceneEvents.on('player:level_up', this.onPlayerChanged, this);

    // РџСЂРѕРІРµСЂСЏРµРј, РЅСѓР¶РЅРѕ Р»Рё Р·Р°РіСЂСѓР·РёС‚СЊ СЃРѕС…СЂР°РЅРµРЅРЅСѓСЋ РёРіСЂСѓ
    if (data.loadSavedGame) {
      this.loadSavedGame();
    } else {
      this.startNewGame();
    }

    // РЎРѕС…СЂР°РЅРµРЅРёРµ С‚РµРїРµСЂСЊ РїСЂРѕРёСЃС…РѕРґРёС‚ РїРѕСЃР»Рµ РєР°Р¶РґРѕРіРѕ РґРµР№СЃС‚РІРёСЏ РёРіСЂРѕРєР°
  }

  onStatusChanged({ previous, current }) {
    if (current === StatusEvents.PLAYING && previous !== StatusEvents.PLAYING) {
      yandexGames.startGameplay();
    } else if (previous === StatusEvents.PLAYING && current !== StatusEvents.PLAYING) {
      yandexGames.stopGameplay();
    }
    if (current === StatusEvents.WIN) {
      audioManager.playWinMusic();
      this.scene.start(SCENE_KEYS.GAME_OVER, {
        win: true,
        time: dataManager.getElapsedTime(),
        score: dataManager.player ? dataManager.player.score : 0
      });
    }
    if (current === StatusEvents.AWAITING_REVIVE) {
      this.cameras.main.shake(1000, 0.002);
      this.time.delayedCall(1000, () => {
        this.showReviveOrSurrenderUI();
      });
    }
    if (current === StatusEvents.LOSE) {
      this.cameras.main.shake(1000, 0.002);
      this.time.delayedCall(2000, () => {
        this.scene.start(SCENE_KEYS.GAME_OVER, {
          win: false,
          time: dataManager.getElapsedTime(),
          score: dataManager.player ? dataManager.player.score : 0
        });
      });
    }
  }

  onSceneShutdown() {
    sceneEvents.off(StatusEvents.CHANGED, this.onStatusChanged, this);
    sceneEvents.off('player:hp_changed', this.onPlayerChanged, this);
    sceneEvents.off('player:xp_changed', this.onPlayerChanged, this);
    sceneEvents.off('player:level_up', this.onPlayerChanged, this);
  }

  onPlayerChanged() {
    // РЎРѕС…СЂР°РЅСЏРµРј РёРіСЂСѓ РїСЂРё РІР°Р¶РЅС‹С… РёР·РјРµРЅРµРЅРёСЏС… РёРіСЂРѕРєР°
    if (dataManager.status === StatusEvents.PLAYING) {
      gameSaveManager.saveGameState();
    }
  }

  update(time, delta) {
    this.game.ecs.world.execute(delta, time);
  }

  startNewGame() {
    if (audioManager && typeof audioManager.destroy === 'function') {
      audioManager.destroy();
    }
    audioManager.initialize(this);

    dataManager.initialize(this);
    this.game.ecs = {};
    this.game.ecs.world = new World();

    window.ecsWorld = this.game.ecs.world;
    window.Components = Components;

    if (!this.game.ecs.componentsRegistered) {
      Object.values(Components).forEach(component => {
        this.game.ecs.world.registerComponent(component);
      });
      this.game.ecs.componentsRegistered = true;
    }

    const levelGenerator = new LevelGenerator(this.game.ecs.world);
    levelGenerator.generate();

    this.initializeSystems();

    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РјРµРЅРµРґР¶РµСЂ СЌС„С„РµРєС‚РѕРІ
    if (this.effectManager && typeof this.effectManager.destroy === 'function') {
      this.effectManager.destroy();
    }
    this.effectManager = new EffectManager(this.game.ecs.world, dataManager.tileSize, this);

    // РџРµСЂРµРёРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј AudioManager РґР»СЏ РЅРѕРІРѕР№ РёРіСЂС‹
    audioManager.reinitialize(this);

    // РњСѓР·С‹РєР° Р±СѓРґРµС‚ Р·Р°РїСѓС‰РµРЅР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё С‡РµСЂРµР· onUserInteraction РїСЂРё РїРµСЂРІРѕРј РєР»РёРєРµ

    // Р—Р°РїСѓСЃРєР°РµРј UI СЃС†РµРЅСѓ
    this.scene.launch(SCENE_KEYS.UI);
  }

  loadSavedGame() {

    const savedGame = gameSaveManager.loadGameState();
    if (!savedGame) {

      // Р•СЃР»Рё РЅРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРѕС…СЂР°РЅРµРЅРёРµ, РЅР°С‡РёРЅР°РµРј РЅРѕРІСѓСЋ РёРіСЂСѓ
      this.startNewGame();
      return;
    }


    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј Р±Р°Р·РѕРІС‹Рµ РєРѕРјРїРѕРЅРµРЅС‚С‹
    if (audioManager && typeof audioManager.destroy === 'function') {
      audioManager.destroy();
    }
    audioManager.initialize(this);

    dataManager.initialize(this);
    this.game.ecs = {};
    this.game.ecs.world = new World();

    window.ecsWorld = this.game.ecs.world;
    window.Components = Components;

    if (!this.game.ecs.componentsRegistered) {
      Object.values(Components).forEach(component => {
        this.game.ecs.world.registerComponent(component);
      });
      this.game.ecs.componentsRegistered = true;
    }

    // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ РёРіСЂС‹ (РІРєР»СЋС‡Р°СЏ РїР»РёС‚РєРё)
    gameSaveManager.deserializePlayer(savedGame.player);
    gameSaveManager.deserializeGameData(savedGame.gameData);
    gameSaveManager.restoreEntities(this.game.ecs.world, savedGame.entities);

    this.initializeSystems();

    // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РјРµРЅРµРґР¶РµСЂ СЌС„С„РµРєС‚РѕРІ
    if (this.effectManager && typeof this.effectManager.destroy === 'function') {
      this.effectManager.destroy();
    }
    this.effectManager = new EffectManager(this.game.ecs.world, dataManager.tileSize, this);

    // РџРµСЂРµРёРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј AudioManager
    audioManager.reinitialize(this);

    // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј СЃС‚Р°С‚СѓСЃ РёРіСЂС‹
    dataManager.setStatus(savedGame.status);


    // Р—Р°РїСѓСЃРєР°РµРј UI СЃС†РµРЅСѓ
    this.scene.launch(SCENE_KEYS.UI);

  }

  initializeSystems() {
    const gridWidth = dataManager.width * dataManager.tileSize;
    const gridHeight = dataManager.height * dataManager.tileSize;
    if (isMobile) {
        this.offsetX = (this.scale.width - gridWidth) / 2;
        this.offsetY = (this.scale.height - gridHeight) / 2;
    } else {
        this.offsetX = 0;
        this.offsetY = 0;
    }

    // Р¤РѕРЅ РїРѕРґ СЃРµС‚РєРѕР№ (РѕСЃС‚Р°РІР»СЏРµРј С‚РѕР»СЊРєРѕ РґР»СЏ РјРѕР±РёР»СЊРЅС‹С…, РµСЃР»Рё РЅСѓР¶РЅРѕ)
    if (isMobile) {
      this.add.rectangle(
        this.cameras.main.centerX,
        this.offsetY + gridHeight / 2,
        gridWidth,
        gridHeight,
        0x1a1a1a
      ).setOrigin(0.5);
    }

    this.game.ecs.world.registerSystem(RenderSystem, {
      scene: this,
      tileSize: dataManager.tileSize,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    });
    this.game.ecs.world.registerSystem(PlayerInputSystem, {
      scene: this,
      tileSize: dataManager.tileSize,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    });
    this.game.ecs.world.registerSystem(CombatSystem);
    this.game.ecs.world.registerSystem(RevealSystem);

    // Р РµРіРёСЃС‚СЂРёСЂСѓРµРј EffectSystem
    this.game.ecs.world.registerSystem(EffectSystem, {
      scene: this,
      tileSize: dataManager.tileSize,
    });

    this.game.ecs.world.registerSystem(ItemActivationSystem, {
      scene: this,
    });
    this.game.ecs.world.registerSystem(ChestSystem);
    this.game.ecs.world.registerSystem(CollectSystem);
    this.game.ecs.world.registerSystem(LootSystem);
    this.game.ecs.world.registerSystem(WallCombatSystem);
    this.game.ecs.world.registerSystem(ButterflySystem);
    this.game.ecs.world.registerSystem(ObjectCounterSystem);
  }



  /**
   * РџРѕРєР°Р·С‹РІР°РµС‚ UI СЃ РєРЅРѕРїРєР°РјРё 'РћР¶РёС‚СЊ' Рё 'РЎРґР°С‚СЊСЃСЏ' РїРѕСЃР»Рµ СЃРјРµСЂС‚Рё
   */
  showReviveOrSurrenderUI() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY - 40;
    const isMobileDevice = window.innerWidth < window.innerHeight;
    const width = isMobileDevice ? 600 : 300;
    const height = isMobileDevice ? 360 : 180;
    // Р—Р°С‚РµРјРЅСЏСЋС‰РёР№ С„РѕРЅ
    this.reviveBg = this.add.nineslice(centerX, centerY, 'hud', null, width, height, 8, 8, 8, 8).setDepth(1000);
    // РљРЅРѕРїРєР° 'РћР¶РёС‚СЊ'
    const btnWidth = isMobileDevice ? 360 : 180;
    const btnHeight = isMobileDevice ? 88 : 44;
    const btnSpacing = isMobileDevice ? 36 : 18;
    const totalHeight = btnHeight * 2 + btnSpacing;
    const firstBtnY = centerY - totalHeight / 2 + btnHeight / 2;
    const secondBtnY = firstBtnY + btnHeight + btnSpacing;
    this.reviveBtn = this.add.container(centerX, firstBtnY).setDepth(1001);
    const reviveBtnBg = this.add.nineslice(0, 0, 'button-green', null, btnWidth, btnHeight, 8, 8, 8, 8);
    reviveBtnBg.setInteractive({ useHandCursor: true });
    const reviveIcon = this.add.image(-btnWidth / 2 + (isMobileDevice ? 48 : 24), 0, 'icons', 33).setScale(isMobileDevice ? 1.8 : 0.9);
    const reviveText = this.add.bitmapText(10, 0, 'ui', t('revive'), isMobileDevice ? 36 : 18).setOrigin(0.5).setTint(0xffffff);
    this.reviveBtn.add([reviveBtnBg, reviveIcon, reviveText]);
    reviveBtnBg.on('pointerdown', () => {
      this.handleReviveClick();
    });
    // РљРЅРѕРїРєР° 'РЎРґР°С‚СЊСЃСЏ'
    this.surrenderBtn = this.add.container(centerX, secondBtnY).setDepth(1001);
    const surrenderBtnBg = this.add.nineslice(0, 0, 'button', null, btnWidth, btnHeight, 8, 8, 8, 8);
    surrenderBtnBg.setInteractive({ useHandCursor: true });
    const surrenderText = this.add.bitmapText(0, 0, 'ui', t('surrender'), isMobileDevice ? 36 : 18).setOrigin(0.5).setTint(0xffffff);
    this.surrenderBtn.add([surrenderBtnBg, surrenderText]);
    surrenderBtnBg.on('pointerdown', () => {
      dataManager.endTime = Date.now();
      this.hideReviveOrSurrenderUI();
      dataManager.setStatus(StatusEvents.LOSE);
    });
  }

  hideReviveOrSurrenderUI() {
    if (this.reviveBg) this.reviveBg.destroy();
    if (this.reviveTitle) this.reviveTitle.destroy();
    if (this.reviveBtn) this.reviveBtn.destroy();
    if (this.surrenderBtn) this.surrenderBtn.destroy();
  }

  handleReviveClick() {
    if (!yandexGames.canShowRewardedVideo()) {
      // Р”Р»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё РїСЂРѕСЃС‚Рѕ РІРѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј Р·РґРѕСЂРѕРІСЊРµ
      dataManager.player.revive();
      dataManager.setStatus(StatusEvents.PLAYING);
      this.hideReviveOrSurrenderUI();
      dataManager.reviveUsed = true;
      return;
    }
    audioManager.pauseMusic();
    yandexGames.showRewardedVideo({
        onOpen: () => { },
        onRewarded: () => {
          dataManager.player.revive();
          dataManager.setStatus(StatusEvents.PLAYING);
          this.hideReviveOrSurrenderUI();
          dataManager.reviveUsed = true;
          if (audioManager.settings.musicEnabled && audioManager.music && audioManager.music.isPaused) {
            audioManager.resumeMusic();
          }
        },
        onClose: () => {
          if (audioManager.settings.musicEnabled && audioManager.music && audioManager.music.isPaused) {
            audioManager.resumeMusic();
          }
        },
        onError: () => {
          // РњРѕР¶РЅРѕ РїРѕРєР°Р·Р°С‚СЊ РѕС€РёР±РєСѓ РёР»Рё РѕСЃС‚Р°РІРёС‚СЊ UI
          if (audioManager.settings.musicEnabled && audioManager.music && audioManager.music.isPaused) {
            audioManager.resumeMusic();
          }
        }
          });
  }
}

