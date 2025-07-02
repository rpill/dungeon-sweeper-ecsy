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
import { t } from '../i18n';

export class Game extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create() {
    // Инициализируем глобальный менеджер звуков
    audioManager.initialize(this);
    
    // Добавляем обработчик первого взаимодействия
    this.input.on('pointerdown', () => {
      audioManager.onUserInteraction();
    });

    // Централизованная обработка завершения игры
    sceneEvents.on(StatusEvents.CHANGED, this.onStatusChanged, this);
    this.events.on('shutdown', this.onSceneShutdown, this);
    
    this.startNewGame();
  }

  onStatusChanged({ previous, current }) {
    if (window.ysdk?.features?.GameplayAPI) {
      if (current === StatusEvents.PLAYING && previous !== StatusEvents.PLAYING) {
        window.ysdk.features.GameplayAPI.start();
      } else if (previous === StatusEvents.PLAYING && current !== StatusEvents.PLAYING) {
        window.ysdk.features.GameplayAPI.stop();
      }
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

    if (!this.renderContainer) {
      this.renderContainer = this.add.container();
    }

    this.game.ecs.world.registerSystem(RenderSystem, {
      scene: this,
      container: this.renderContainer,
      tileSize: dataManager.tileSize,
    });
    this.game.ecs.world.registerSystem(PlayerInputSystem, {
      scene: this,
      tileSize: dataManager.tileSize,
    });
    this.game.ecs.world.registerSystem(CombatSystem);
    this.game.ecs.world.registerSystem(RevealSystem);
    
    // Регистрируем EffectSystem
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

    // Инициализируем менеджер эффектов
    if (this.effectManager && typeof this.effectManager.destroy === 'function') {
      this.effectManager.destroy();
    }
    this.effectManager = new EffectManager(this.game.ecs.world, dataManager.tileSize);

    // Переинициализируем AudioManager для новой игры
    audioManager.reinitialize(this);

    // Музыка будет запущена автоматически через onUserInteraction при первом клике

    // Запускаем UI сцену
    this.scene.launch(SCENE_KEYS.UI);

    if (dataManager.gameStartCount % 5 === 0 && window.ysdk?.adv) {
      if (window.ysdk?.features?.GameplayAPI) {
        window.ysdk.features.GameplayAPI.stop();
      }
      window.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: () => {
            if (window.ysdk?.features?.GameplayAPI) {
              window.ysdk.features.GameplayAPI.start();
            }
          },
          onError: () => {
            if (window.ysdk?.features?.GameplayAPI) {
              window.ysdk.features.GameplayAPI.start();
            }
          }
        }
      });
    }
  }

  /**
   * Показывает UI с кнопками 'Ожить' и 'Сдаться' после смерти
   */
  showReviveOrSurrenderUI() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY - 40;
    const width = 300;
    const height = 180;
    // Затемняющий фон
    this.reviveBg = this.add.nineslice(centerX, centerY, 'hud', null, width, height, 8, 8, 8, 8).setDepth(1000);
    // Кнопка 'Ожить'
    const btnWidth = 180;
    const btnHeight = 44;
    const btnSpacing = 18;
    const totalHeight = btnHeight * 2 + btnSpacing;
    const firstBtnY = centerY - totalHeight / 2 + btnHeight / 2;
    const secondBtnY = firstBtnY + btnHeight + btnSpacing;
    this.reviveBtn = this.add.container(centerX, firstBtnY).setDepth(1001);
    const reviveBtnBg = this.add.nineslice(0, 0, 'button-green', null, btnWidth, btnHeight, 8, 8, 8, 8);
    reviveBtnBg.setInteractive({ useHandCursor: true });
    const reviveIcon = this.add.image(-btnWidth/2 + 24, 0, 'icons', 33).setScale(0.9);
    const reviveText = this.add.bitmapText(10, 0, 'ui', t('revive'), 18).setOrigin(0.5).setTint(0xffffff);
    this.reviveBtn.add([reviveBtnBg, reviveIcon, reviveText]);
    reviveBtnBg.on('pointerdown', () => {
      this.handleReviveClick();
    });
    // Кнопка 'Сдаться'
    this.surrenderBtn = this.add.container(centerX, secondBtnY).setDepth(1001);
    const surrenderBtnBg = this.add.nineslice(0, 0, 'button', null, btnWidth, btnHeight, 8, 8, 8, 8);
    surrenderBtnBg.setInteractive({ useHandCursor: true });
    const surrenderText = this.add.bitmapText(0, 0, 'ui', t('surrender'), 18).setOrigin(0.5).setTint(0xffffff);
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
    if (!window.ysdk?.adv?.showRewardedVideo) {
      // Для локальной разработки просто восстанавливаем здоровье
      dataManager.player.heal();
      dataManager.setStatus(StatusEvents.PLAYING);
      this.hideReviveOrSurrenderUI();
      dataManager.reviveUsed = true;
      return;
    }
    window.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {},
        onRewarded: () => {
          dataManager.player.heal();
          dataManager.setStatus(StatusEvents.PLAYING);
          this.hideReviveOrSurrenderUI();
          dataManager.reviveUsed = true;
        },
        onClose: () => {},
        onError: () => {
          // Можно показать ошибку или оставить UI
        }
      }
    });
  }
}