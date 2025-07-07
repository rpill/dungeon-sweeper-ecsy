import { dataManager } from './DataManager';
import { StatusEvents } from './events/EventNames';

class GameSaveManager {
  constructor() {
    if (GameSaveManager.instance) {
      return GameSaveManager.instance;
    }
    this.SAVE_KEY = 'dungeon_sweeper_save';
    GameSaveManager.instance = this;
  }

  /**
   * Сохраняет текущее состояние игры
   */
  saveGameState() {
    if (!dataManager.scene || !dataManager.scene.game.ecs) {
      console.log('GameSaveManager: saveGameState - нет scene или ecs');
      return false;
    }

    const world = dataManager.scene.game.ecs.world;
    if (!world) {
      console.log('GameSaveManager: saveGameState - нет world');
      return false;
    }

    try {
      const gameState = {
        timestamp: Date.now(),
        player: this.serializePlayer(),
        gameData: this.serializeGameData(),
        entities: this.serializeEntities(world),
        status: dataManager.status
      };

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(gameState));
      console.log('GameSaveManager: saveGameState - сохранено успешно');
      return true;
    } catch (error) {
      console.warn('Ошибка сохранения игры:', error);
      return false;
    }
  }

  /**
   * Загружает сохраненное состояние игры
   */
  loadGameState() {
    try {
      const saveData = localStorage.getItem(this.SAVE_KEY);
      if (!saveData) {
        return null;
      }

      const gameState = JSON.parse(saveData);
      
      // Проверяем, что сохранение не слишком старое (24 часа)
      const now = Date.now();
      const saveAge = now - gameState.timestamp;
      if (saveAge > 24 * 60 * 60 * 1000) {
        this.clearSave();
        return null;
      }

      return gameState;
    } catch (error) {
      console.warn('Ошибка загрузки игры:', error);
      this.clearSave();
      return null;
    }
  }

  /**
   * Проверяет, есть ли сохраненная игра
   */
  hasSavedGame() {
    const saveData = this.loadGameState();
    const hasSave = saveData !== null && saveData.status === StatusEvents.PLAYING;
    console.log('GameSaveManager: hasSavedGame:', hasSave);
    console.log('GameSaveManager: saveData:', saveData);
    return hasSave;
  }

  /**
   * Очищает сохранение
   */
  clearSave() {
    localStorage.removeItem(this.SAVE_KEY);
  }

  /**
   * Сериализует данные игрока
   */
  serializePlayer() {
    if (!dataManager.player) {
      return null;
    }

    return {
      maxHP: dataManager.player.maxHP,
      hp: dataManager.player.hp,
      xp: dataManager.player.xp,
      level: dataManager.player.level,
      score: dataManager.player.score
    };
  }

  /**
   * Десериализует данные игрока
   */
  deserializePlayer(playerData) {
    if (!playerData || !dataManager.player) {
      return;
    }

    dataManager.player.maxHP = playerData.maxHP;
    dataManager.player.hp = playerData.hp;
    dataManager.player.xp = playerData.xp;
    dataManager.player.level = playerData.level;
    dataManager.player.score = playerData.score;
  }

  /**
   * Сериализует игровые данные
   */
  serializeGameData() {
    return {
      startTime: dataManager.startTime,
      endTime: dataManager.endTime,
      gameStartCount: dataManager.gameStartCount,
      reviveUsed: dataManager.reviveUsed
    };
  }

  /**
   * Десериализует игровые данные
   */
  deserializeGameData(gameData) {
    if (!gameData) {
      return;
    }

    dataManager.startTime = gameData.startTime;
    dataManager.endTime = gameData.endTime;
    dataManager.gameStartCount = gameData.gameStartCount;
    dataManager.reviveUsed = gameData.reviveUsed;
  }

  /**
   * Сериализует все сущности мира
   */
  serializeEntities(world) {
    const entities = [];
    // Получаем все сущности с компонентом Position
    for (const entity of world.entityManager._entities) {
      if (entity.hasComponent(window.Components.Position)) {
        const entityData = {
          id: entity.id,
          components: {}
        };
        // Сериализуем все компоненты сущности
        entity.getComponentTypes().forEach(ComponentClass => {
          const component = entity.getComponent(ComponentClass);
          if (component) {
            const componentName = ComponentClass.name;
            entityData.components[componentName] = this.serializeComponent(component);
          }
        });
        entities.push(entityData);
      }
    }
    return entities;
  }

  /**
   * Сериализует компонент
   */
  serializeComponent(component) {
    const data = {};
    
    // Для TagComponent просто возвращаем пустой объект
    if (component.constructor.prototype.constructor.name === 'TagComponent' || 
        component.constructor.name.includes('TagComponent')) {
      return data;
    }
    
    // Получаем схему компонента
    if (component.constructor.schema) {
      Object.keys(component.constructor.schema).forEach(key => {
        data[key] = component[key];
      });
    } else {
      // Если нет схемы, копируем все свойства
      Object.keys(component).forEach(key => {
        if (typeof component[key] !== 'function') {
          data[key] = component[key];
        }
      });
    }

    return data;
  }

  /**
   * Восстанавливает сущности в мире
   */
  restoreEntities(world, entitiesData) {
    if (!entitiesData || !Array.isArray(entitiesData)) {
      return;
    }

    // Очищаем существующие сущности (кроме плиток)
    for (const entity of world.entityManager._entities.slice()) {
      if (entity.hasComponent(window.Components.Position)) {
        // Удаляем только акторов, оставляем плитки
        if (entity.hasComponent(window.Components.Tile)) {
          continue;
        }
        entity.remove();
      }
    }

    // Восстанавливаем сущности из сохранения
    entitiesData.forEach(entityData => {
      const entity = world.createEntity();
      // Восстанавливаем компоненты
      Object.keys(entityData.components).forEach(componentName => {
        const ComponentClass = window.Components[componentName];
        if (ComponentClass) {
          const componentData = entityData.components[componentName];
          // Для TagComponent не передаем данные
          if (ComponentClass.prototype.constructor.name === 'TagComponent' || 
              ComponentClass.name.includes('TagComponent')) {
            entity.addComponent(ComponentClass);
          } else {
            entity.addComponent(ComponentClass, componentData);
          }
        }
      });
    });

    // Очищаем визуальные объекты, чтобы RenderSystem пересоздал их
    for (const entity of world.entityManager._entities) {
      if (entity.hasComponent(window.Components.Sprite)) {
        const spriteComponent = entity.getComponent(window.Components.Sprite);
        if (spriteComponent.spriteObj) {
          delete spriteComponent.spriteObj;
        }
      }
      // Очищаем другие визуальные компоненты, если есть
      if (entity.hasComponent(window.Components.Tile)) {
        const tileComponent = entity.getComponent(window.Components.Tile);
        if (tileComponent.spriteObj) {
          delete tileComponent.spriteObj;
        }
      }
    }
  }
}

export const gameSaveManager = new GameSaveManager(); 