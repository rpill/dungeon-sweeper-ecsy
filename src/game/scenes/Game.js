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

export class Game extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create() {
    console.log('Game scene create');
    this.startNewGame();

    this.input.keyboard.on('keydown-L', () => {
      const xp = dataManager.player.nextLevelXP();
      dataManager.player.grantXP(xp);
      dataManager.player.heal();
      dataManager.player.levelUp();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (dataManager.status !== StatusEvents.PLAYING) return;
      this.scene.pause(SCENE_KEYS.GAME);
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.MENU);
    });

    // this.input.keyboard.on('keydown-D', () => {
    //   dataManager.debug = !dataManager.debug;
    // });
    this.input.keyboard.on('keydown-B', () => {
      const butterflies = this.game.ecs.world.entityManager._entities
        ? Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent && e.hasComponent(Components.Butterfly))
        : [];
      console.log('Текущие позиции бабочек:', butterflies.map(b => b.getComponent(Components.Position)));
    });

    // this.scene.launch(SCENE_KEYS.UI);

    // Централизованная обработка завершения игры
    sceneEvents.on(StatusEvents.CHANGED, ({ current }) => {
      if (current === StatusEvents.WIN) {
        this.scene.start(SCENE_KEYS.GAME_OVER, { win: true, time: dataManager.getElapsedTime(), score: dataManager.player ? dataManager.player.score : 0 });
      }
      if (current === StatusEvents.LOSE) {
        this.cameras.main.shake(1000, 0.002);
        this.time.delayedCall(2000, () => {
          this.scene.start(SCENE_KEYS.GAME_OVER, { win: false, time: dataManager.getElapsedTime(), score: dataManager.player ? dataManager.player.score : 0 });
        });
      }
    });
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
    
    // Регистрируем EffectSystem и сохраняем ссылку для очистки
    const effectSystem = this.game.ecs.world.registerSystem(EffectSystem, {
      scene: this,
      tileSize: dataManager.tileSize,
    });
    
    // Сбрасываем счетчик анимаций при новой игре
    if (effectSystem && effectSystem.resetCounter) {
      effectSystem.resetCounter();
    }
    
    this.game.ecs.world.registerSystem(ItemActivationSystem);
    this.game.ecs.world.registerSystem(ChestSystem);
    this.game.ecs.world.registerSystem(CollectSystem);
    this.game.ecs.world.registerSystem(LootSystem);
    this.game.ecs.world.registerSystem(WallCombatSystem);
    this.game.ecs.world.registerSystem(ButterflySystem);

    // Инициализируем менеджер эффектов
    this.effectManager = new EffectManager(this.game.ecs.world, dataManager.tileSize);

    // console.log(this.game.ecs.world.entityManager._entities);
    // const tiles = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Tile));
    // console.log('Клеток:', tiles.length);

    // const monsters = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Monster));
    // console.log('Монстров:', monsters.length);

    // const chests = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Chest));
    // console.log('Сундуков:', chests.length);
  }

  restartGame() {
    // Полная очистка ECS-мирa предыдущей игры
    if (this.game.ecs && this.game.ecs.world) {
      const world = this.game.ecs.world;
      // Остановить все системы
      if (world.systemManager && world.systemManager._systems) {
        Object.values(world.systemManager._systems).forEach(system => {
          if (typeof system.stop === 'function') {
            system.stop();
          }
          // Очищаем анимации эффектов при перезапуске
          if (system.cleanupAllAnimations && typeof system.cleanupAllAnimations === 'function') {
            system.cleanupAllAnimations();
          }
        });
        world.systemManager._systems = {};
      }
      // Удалить все сущности
      if (world.entityManager && world.entityManager._entities) {
        Object.values(world.entityManager._entities).forEach(entity => {
          if (entity.hasComponent && entity.hasComponent(Components.SpriteObjects)) {
            const spriteObjects = entity.getComponent(Components.SpriteObjects);
            spriteObjects.destroyAll();
          }
          if (entity.removeAllComponents) entity.removeAllComponents();
          if (entity.remove) entity.remove();
        });
        world.entityManager._entities = {};
      }
      // Удалить ссылку на ECS-мир
      this.game.ecs.world = null;
    }

    // Уничтожаем менеджер эффектов
    if (this.effectManager) {
      this.effectManager.destroy();
      this.effectManager = null;
    }
    
    this.startNewGame();

    this.scene.launch(SCENE_KEYS.UI);
  }
}