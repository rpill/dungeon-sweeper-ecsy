import { dataManager } from './DataManager';
import { StatusEvents } from './events/EventNames';
import CryptoJS from 'crypto-js';

class GameSaveManager {
  constructor() {
    if (GameSaveManager.instance) {
      return GameSaveManager.instance;
    }
    this.SAVE_KEY = 'dungeon_sweeper_save';
    this.ENCRYPTION_KEY = 'dungeon_sweeper_secret_key_2024';
    GameSaveManager.instance = this;
  }

  /**
   * Шифрует данные с помощью AES
   */
  encryptData(data) {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      return null;
    }
  }

  /**
   * Дешифрует данные
   */
  decryptData(encryptedData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Создаёт хеш для проверки целостности
   */
  createHash(data) {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Простое сжатие JSON строки
   */
  compressData(data) {
    return JSON.stringify(data).replace(/\s+/g, '');
  }

  /**
   * Простое восстановление JSON строки
   */
  decompressData(compressedData) {
    return JSON.parse(compressedData);
  }

  /**
   * Сохраняет текущее состояние игры
   */
  saveGameState() {
          if (!dataManager.scene || !dataManager.scene.game.ecs) {
        return false;
      }

      const world = dataManager.scene.game.ecs.world;
      if (!world) {
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

      // Сжимаем и создаём хеш для проверки целостности
      const compressedGameState = this.compressData(gameState);
      const hash = this.createHash(compressedGameState);
      
      const saveData = {
        data: compressedGameState,
        hash: hash,
        version: '1.0'
      };

      // Шифруем данные
      const encryptedData = this.encryptData(saveData);
              if (encryptedData) {
          localStorage.setItem(this.SAVE_KEY, encryptedData);
          return true;
        } else {
          return false;
        }
    } catch (error) {
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

      // Дешифруем данные
      const decryptedData = this.decryptData(saveData);
      if (!decryptedData) {
        this.clearSave();
        return null;
      }

      // Проверяем версию
      if (decryptedData.version !== '1.0') {
        this.clearSave();
        return null;
      }

      // Проверяем целостность данных
      const expectedHash = this.createHash(decryptedData.data);
      if (decryptedData.hash !== expectedHash) {
        this.clearSave();
        return null;
      }

      // Восстанавливаем данные
      const gameState = this.decompressData(decryptedData.data);
      
      // Проверяем, что сохранение не слишком старое (24 часа)
      const now = Date.now();
      const saveAge = now - gameState.timestamp;
      if (saveAge > 24 * 60 * 60 * 1000) {
        this.clearSave();
        return null;
      }

      return gameState;
    } catch (error) {
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
      startTimestamp: dataManager.startTimestamp,
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
    dataManager.startTimestamp = gameData.startTimestamp || null;
    dataManager.reviveUsed = gameData.reviveUsed;
  }

  /**
   * Сериализует все сущности мира
   */
  serializeEntities(world) {
    const entities = [];
    // Получаем все сущности с компонентом Position (включая плитки)
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
    
    // Исключаем только визуальные компоненты, но сохраняем логику плиток
    const componentName = component.constructor.name;
    if (componentName === 'SpriteObjects' || componentName === 'Animated') {
      return data; // Не сохраняем визуальные объекты
    }
    
    // Для плиток сохраняем только важные данные
    if (componentName === 'Tile') {
      return {
        baseType: component.baseType,
        mark: component.mark
      };
    }
    
    // Получаем схему компонента
    if (component.constructor.schema) {
      Object.keys(component.constructor.schema).forEach(key => {
        data[key] = component[key];
      });
    } else {
      // Если нет схемы, копируем только важные свойства
      Object.keys(component).forEach(key => {
        if (typeof component[key] !== 'function' && 
            key !== 'spriteObj' && 
            key !== 'dmgText' && 
            key !== 'hpText' && 
            key !== 'xpText' && 
            key !== 'coinIcon' && 
            key !== 'markObj') {
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

    // Очищаем все существующие сущности
    for (const entity of world.entityManager._entities.slice()) {
      if (entity.hasComponent(window.Components.Position)) {
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