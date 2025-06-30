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

    this.input.keyboard.on('keydown-L', () => {
      const xp = dataManager.player.nextLevelXP();
      dataManager.player.grantXP(xp);
      dataManager.player.heal();
      dataManager.player.levelUp();
    });
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
}