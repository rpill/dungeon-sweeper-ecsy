import actorDefinitions from '../data/actor-definitions.json';
import * as Components from '../ecs/components';
import { dataManager } from '../DataManager';
import { ACTOR_TYPES, ORB_RADIUS } from '../constants/actor';
import Phaser from 'phaser';
import { StatusEvents } from '../events/EventNames';
import { findEntityAt } from '../ecs/helpers';

export class LevelGenerator {
  constructor(world) {
    this.world = world;
    this.spatialMap = new Map();
    this.width = 0;
    this.height = 0;
    this.actorsByType = {}; // Кэш акторов по типам
  }

  generate() {
    dataManager.setStatus(StatusEvents.GENERATING_LEVEL);

    this.width = dataManager.width;
    this.height = dataManager.height;
    this.spatialMap = new Map();
    this.actorsByType = {}; // Сбрасываем кэш

    // Инициализируем spatialMap пустыми значениями
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.spatialMap.set(`${x},${y}`, null);
      }
    }

    // 1. Создаём плитки (НЕ добавляем их в spatialMap)
    this.generateBaseLevel();

    // 2. Генерация акторов в слоях с оптимизацией
    this.beginLayer();
    this.add(ACTOR_TYPES.DRAGON, 1, { revealed: true });
    this.add(ACTOR_TYPES.WIZARD, 1);
    this.endLayer();

    this.beginLayer();
    this.add(ACTOR_TYPES.BIG_SLIME, 5);
    this.endLayer();

    this.beginLayer();
    this.add(ACTOR_TYPES.MINE_KING, 1);
    this.endLayer();

    this.beginLayer();
    this.add(ACTOR_TYPES.GOLEM, 2);
    this.endLayer();

    this.beginLayer();
    this.add(ACTOR_TYPES.RAT_KING, 1);
    this.add(ACTOR_TYPES.WALL, 6);
    this.add(ACTOR_TYPES.MINOTAUR, 5);
    this.add(ACTOR_TYPES.GUARD, 4);
    this.add(ACTOR_TYPES.BANSHEE, 2, { name: 'banshee1' });
    this.add(ACTOR_TYPES.BANSHEE, 2, { name: 'banshee2' });
    this.add(ACTOR_TYPES.BANSHEE, 2, { name: 'banshee3' });
    this.add(ACTOR_TYPES.BANSHEE, 2, { name: 'banshee4' });
    this.add(ACTOR_TYPES.GAZER, 2);
    this.add(ACTOR_TYPES.MINE, 9);
    this.add(ACTOR_TYPES.MEDKIT, 5);
    this.addChests(7);
    this.add(ACTOR_TYPES.ORB, 1, { revealed: true });
    this.add(ACTOR_TYPES.DRAGON_EGG, 1);
    this.endLayer();

    this.beginLayer();
    this.add(ACTOR_TYPES.RAT, 13);
    this.add(ACTOR_TYPES.BAT, 12);
    this.add(ACTOR_TYPES.SKELETON, 10);
    this.add(ACTOR_TYPES.SLIME, 8);
    this.add(ACTOR_TYPES.MIMIC, 1);
    this.add(ACTOR_TYPES.BUTTERFLY, 1);
    this.add(ACTOR_TYPES.SPELL_MAKE_ORB, 1);
    this.endLayer();

    this.postProcessGeneration();

    dataManager.setStatus(StatusEvents.PLAYING);
  }

  generateBaseLevel() {
    console.log('LevelGenerator: generateBaseLevel - создаем базовый уровень');
    // Создаём только плитки (НЕ добавляем их в spatialMap)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileEntity = this.world.createEntity();
        tileEntity.addComponent(Components.Position, { x, y });
        tileEntity.addComponent(Components.Tile, {
          baseType: Phaser.Math.Between(0, 4)
        });
        // НЕ добавляем плитки в spatialMap
      }
    }
    console.log('LevelGenerator: generateBaseLevel - базовый уровень создан');
  }

  beginLayer() {
    this.currentLayerEntities = [];
  }

  endLayer() {
    let layerEntities = [];
    
    // Собираем все пустые позиции заранее
    const emptyPositions = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const entity = this.spatialMap.get(`${x},${y}`);
        if (entity === null) {
          emptyPositions.push({ x, y });
        } else if (entity && entity.isTemp && entity.getComponent(Components.Type).value === 'EMPTY') {
          emptyPositions.push({ x, y });
        }
      }
    }
    
    // Перемешиваем пустые позиции
    Phaser.Utils.Array.Shuffle(emptyPositions);
    
    // Размещаем сущности слоя
    for (let i = 0; i < this.currentLayerEntities.length && i < emptyPositions.length; i++) {
      const entity = this.currentLayerEntities[i];
      const emptyPosition = emptyPositions[i];
      
      const position = entity.getComponent(Components.Position);
      position.x = emptyPosition.x;
      position.y = emptyPosition.y;

      this.spatialMap.set(`${position.x},${position.y}`, entity);
      layerEntities.push(entity);
    }

    // Кэшируем позиции акторов по типу
    this.updateActorsByType();
    
    let bestHappiness = this.calculateTotalHappiness();
    
    // Создаем временные пустые сущности для обмена
    const tempEntities = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const entity = this.spatialMap.get(`${x},${y}`);
        if (entity === null || (entity && entity.isTemp && entity.getComponent(Components.Type).value === 'EMPTY')) {
          const tempEntity = this.world.createEntity();
          tempEntity.addComponent(Components.Position, { x, y });
          tempEntity.addComponent(Components.Type, { value: 'EMPTY' });
          tempEntity.isTemp = true; // Помечаем как временную
          this.spatialMap.set(`${x},${y}`, tempEntity);
          tempEntities.push(tempEntity);
        }
      }
    }
    
    // Оптимизируем размещение
    for (let k = 0; k < 2; k++) {
      Phaser.Utils.Array.Shuffle(layerEntities);
      
      for (let entity of layerEntities) {
        if (!entity.hasComponent(Components.Position)) continue;
        
        let bestSwapEntity = null;
        let bestSwapHappiness = bestHappiness;
        
        // Получаем все сущности с позициями из spatialMap (исключаем null)
        const allEntities = Array.from(this.spatialMap.values()).filter(e =>
          e !== null && e.hasComponent(Components.Type)
        );
        
        for (const otherEntity of allEntities) {
          if (otherEntity === entity || otherEntity.fixed) continue;
          
          // Обмениваем позиции
          this.swapEntityPositions(entity, otherEntity);
          
          // Обновляем кэш для затронутых типов
          this.updateActorsByType();
          
          const newHappiness = this.calculateTotalHappiness();
          
          if (newHappiness > bestSwapHappiness) {
            bestSwapHappiness = newHappiness;
            bestSwapEntity = otherEntity;
          }
          
          // Возвращаем позиции обратно
          this.swapEntityPositions(entity, otherEntity);
          
          // Обновляем кэш обратно
          this.updateActorsByType();
        }
        
        if (bestSwapEntity) {
          this.swapEntityPositions(entity, bestSwapEntity);
          // Обновляем кэш после финального свапа
          this.updateActorsByType();
          bestHappiness = bestSwapHappiness;
        }
      }
    }
    
    // Удаляем временные сущности
    tempEntities.forEach(entity => {
      const pos = entity.getComponent(Components.Position);
      this.spatialMap.delete(`${pos.x},${pos.y}`);
      this.spatialMap.set(`${pos.x},${pos.y}`, null);
      entity.remove(); // Используем правильный метод удаления
    });
    
    // Помечаем сущности как зафиксированные
    layerEntities.forEach(entity => {
      entity.fixed = true;
    });
  }

  swapEntityPositions(entity1, entity2) {
    const pos1 = entity1.getComponent(Components.Position);
    const pos2 = entity2.getComponent(Components.Position);

    // Удаляем старые записи из карты
    this.spatialMap.delete(`${pos1.x},${pos1.y}`);
    this.spatialMap.delete(`${pos2.x},${pos2.y}`);

    const tempX = pos1.x;
    const tempY = pos1.y;
    
    pos1.x = pos2.x;
    pos1.y = pos2.y;
    
    pos2.x = tempX;
    pos2.y = tempY;

    // Добавляем новые записи в карту
    this.spatialMap.set(`${pos1.x},${pos1.y}`, entity1);
    this.spatialMap.set(`${pos2.x},${pos2.y}`, entity2);
  }

  add(type, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 }); // Временная позиция
      const definition = actorDefinitions[type];
      if (definition) {
        definition.forEach(compDef => {
          const ComponentClass = Components[compDef.component];
          if (ComponentClass && compDef.component !== 'Position') {
            entity.addComponent(ComponentClass, compDef.data);
          }
        });
      }
      if (opts.name) entity.name = opts.name;
      if (entity.hasComponent(Components.Sprite) && !entity.hasComponent(Components.Revealed)) {
        if (opts.revealed) {
          entity.addComponent(Components.Revealed);
        }
      }
      
      this.currentLayerEntities.push(entity);
    }
  }

  findEmptyPosition() {
    const emptyPositions = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Проверяем, что на позиции нет игрового объекта (null означает пусто)
        const entity = this.spatialMap.get(`${x},${y}`);
        if (entity === null || (entity && entity.isTemp && entity.getComponent(Components.Type).value === 'EMPTY')) {
          emptyPositions.push({ x, y });
        }
      }
    }
    
    return emptyPositions.length > 0 ? 
            Phaser.Utils.Array.GetRandom(emptyPositions) : 
            null;
  }

  calculateActorHappiness(entity, type, x, y) {
    let happiness = 0;
    // Временные пустые сущности не имеют счастья
    if (type === 'EMPTY' || entity.isTemp) {
      return 0;
    }
    
    if (type === ACTOR_TYPES.DRAGON_EGG) {
      const dragonNearby = this.checkAdjacent(x, y, ACTOR_TYPES.DRAGON, 1.5);
      if (dragonNearby) happiness += 9000;
    } else if (type === ACTOR_TYPES.BUTTERFLY) {
      const medkitNearby = this.checkAdjacent(x, y, ACTOR_TYPES.MEDKIT, 1.5);
      if (medkitNearby) happiness += 10000;
    } else if (type === ACTOR_TYPES.GUARD) {
      if (this.isGuardianInRightQuadrant(entity)) {
        happiness += 2500;
      }
    } else if (type === ACTOR_TYPES.BIG_SLIME) {
      const wizardNearby = this.checkAdjacent(x, y, ACTOR_TYPES.WIZARD, 1.5);
      if (wizardNearby) happiness += 1000;
    } else if (type === ACTOR_TYPES.WIZARD) {
      if (!this.isCorner(x, y) && this.isEdge(x, y)) {
          happiness += 10000;
      }
    } else if (type === ACTOR_TYPES.MINE_KING) {
      if (this.isCorner(x, y)) {
          happiness += 10000;
      }
    } else if (type === ACTOR_TYPES.DRAGON) {
      const targetX = Math.floor(this.width / 2);
      const targetY = 4;
      if (x === targetX && y === targetY) {
          happiness += 10000;
      }
    } else if (type === ACTOR_TYPES.MINOTAUR) {
      let chests = 0;
      let crowded = false;
      
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const entityAtPos = this.findEntityAtPosition(x + dx, y + dy);
          if (entityAtPos && entityAtPos.getComponent(Components.Type).value === ACTOR_TYPES.CHEST) {
            const dist = Phaser.Math.Distance.Between(x, y, x + dx, y + dy);
            if (dist < 2) {
              chests++;
              
              for (let dy2 = -2; dy2 <= 2; dy2++) {
                for (let dx2 = -2; dx2 <= 2; dx2++) {
                  const otherEntity = this.findEntityAtPosition(x + dx + dx2, y + dy + dy2);
                  if (otherEntity && otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.MINOTAUR && 
                      !(otherEntity === entity) &&
                      Phaser.Math.Distance.Between(
                        x + dx, y + dy, 
                        x + dx + dx2, y + dy + dy2
                      ) < 2) {
                    crowded = true;
                  }
                }
              }
            }
          }
        }
      }
      if (chests === 1 && !crowded) {
        happiness += 10000;
      }
    } else if (type === ACTOR_TYPES.BANSHEE) {
      if (this.isBansheeInRightPlace(entity)) {
        happiness += 1000;
      }
    } else if (type === ACTOR_TYPES.ORB) {
      if (this.isCloseToEdge(x, y)) {
        happiness -= 10000;
      }

      let medkitsRevealed = 0;
      let wallsRevealed = 0;
      let minesRevealed = 0;
      let forbiddenObjects = 0;
      
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const dist = Phaser.Math.Distance.Between(x, y, x + dx, y + dy);
          if (dist < ORB_RADIUS) {
            const entityAtPos = this.findEntityAtPosition(x + dx, y + dy);
            if (!entityAtPos) continue;
            
            const entityType = entityAtPos.getComponent(Components.Type).value;
            if ([ACTOR_TYPES.DRAGON, ACTOR_TYPES.GAZER, ACTOR_TYPES.CHEST, 
                 ACTOR_TYPES.SPELL_MAKE_ORB, ACTOR_TYPES.RAT_KING, ACTOR_TYPES.MINE,
                 ACTOR_TYPES.DRAGON_EGG, ACTOR_TYPES.BIG_SLIME, ACTOR_TYPES.MIMIC].includes(entityType)) {
              forbiddenObjects++;
            }

            if (entityType === ACTOR_TYPES.MEDKIT) {
              medkitsRevealed++;
            } else if (entityType === ACTOR_TYPES.MINE) {
              minesRevealed++;
            } else if (entityType === ACTOR_TYPES.WALL) {
              wallsRevealed++;
            }
          }
        }
      }

      happiness += forbiddenObjects * -2000;
      if (wallsRevealed > 2) happiness += (wallsRevealed - 2) * -2000;
      if (medkitsRevealed === 1 && wallsRevealed > 0) happiness += 2000;
    } else if (type === ACTOR_TYPES.MEDKIT) {
      happiness += -1000 * this.countNearMeWithSameId(entity, 3.5);
    } else if (type === ACTOR_TYPES.CHEST) {
      happiness += -1000 * this.countNearMeWithSameId(entity, 3);
    } else if (type === ACTOR_TYPES.WALL) {
      let closeCount = 0;
      let farCount = 0;
      let onEdge = this.isEdge(x, y) ? 1 : 0;
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const entityAtPos = this.findEntityAtPosition(x + dx, y + dy);
          if (entityAtPos && entityAtPos.getComponent(Components.Type).value === ACTOR_TYPES.WALL) {
            const dist = Phaser.Math.Distance.Between(x, y, x + dx, y + dy);
            if (dist <= 1) {
              closeCount++;
              if (this.isEdge(x + dx, y + dy)) onEdge++;
            } else if (dist < 1.5) {
              farCount++;
            }
          }
        }
      }

      if (closeCount === 1 && farCount === 0 && onEdge < 2) {
        happiness += 2000;
      }
    }
    return happiness;
  }

  checkAdjacent(x, y, entityType, maxDistance) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const entity = this.findEntityAtPosition(x + dx, y + dy);
        if (entity && entity.getComponent(Components.Type).value === entityType) {
          const dist = Phaser.Math.Distance.Between(x, y, x + dx, y + dy);
          if (dist <= maxDistance) return true;
        }
      }
    }
    return false;
  }

  findEntityAtPosition(x, y) {
    return this.spatialMap.get(`${x},${y}`);
  }

  isCorner(x, y) {
    return (x === 0 || x === this.width - 1) && (y === 0 || y === this.height - 1);
  }
  
  isEdge(x, y) {
    return x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
  }
  
  isCloseToEdge(x, y) {
    return x <= 1 || x >= this.width - 2 || y <= 1 || y >= this.height - 2;
  }

  postProcessGeneration() {
    // Получаем сущности из карты (исключаем null)
    const entitiesWithPosition = Array.from(this.spatialMap.values()).filter(entity =>
      entity !== null && entity.hasComponent(Components.Type)
    );
    
    for (const entity of entitiesWithPosition) {
      const position = entity.getComponent(Components.Position);
      const type = entity.getComponent(Components.Type).value;
      
      if (type === ACTOR_TYPES.DRAGON || type === ACTOR_TYPES.ORB) {
        if (!entity.hasComponent(Components.Revealed)) {
          entity.addComponent(Components.Revealed);
        }
        
        // Добавляем компонент Revealed к тайлу на этой позиции
        const tileEntity = findEntityAt(Object.values(this.world.entityManager._entities), position.x, position.y, Components.Tile);
        if (tileEntity && !tileEntity.hasComponent(Components.Revealed)) {
          tileEntity.addComponent(Components.Revealed);
        }
      } else if (type === ACTOR_TYPES.BANSHEE) {
        // Настраиваем кадры банши, чтобы они смотрели друг на друга
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const otherEntity = this.findEntityAtPosition(position.x + dx, position.y + dy);
            if (otherEntity && otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.BANSHEE && 
                otherEntity.name === entity.name) {
              
              const sprite = entity.getComponent(Components.Sprite);
              const otherSprite = otherEntity.getComponent(Components.Sprite);
              
              if (position.x < position.x + dx) {
                sprite.frame = 140;
                otherSprite.frame = 143;
              } 
              else if (position.x > position.x + dx) {
                sprite.frame = 143;
                otherSprite.frame = 140;
              } 
              else if (position.y < position.y + dy) {
                sprite.frame = 141;
                otherSprite.frame = 142;
              } 
              else if (position.y > position.y + dy) {
                sprite.frame = 142;
                otherSprite.frame = 141;
              }
              break;
            }
          }
        }
      }
    }
  }

  addChests(count) {
    const medkitChests = 2; // 2 сундука с медкитом
    const xpChests = count - medkitChests; // остальные с опытом

    // Создаем сундуки с медкитом
    for (let i = 0; i < medkitChests; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 }); // Временная позиция

      // Добавляем базовые компоненты сундука
      entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
      entity.addComponent(Components.Chest);
      entity.addComponent(Components.OpenedSprite, { frame: 15 });
      entity.addComponent(Components.Type, { value: 'CHEST' });

      // Добавляем медкит как лут
      entity.addComponent(Components.Loot, { type: 'MEDKIT' });
      
      this.currentLayerEntities.push(entity);
    }

    // Создаем сундуки с опытом
    for (let i = 0; i < xpChests; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 }); // Временная позиция

      // Добавляем базовые компоненты сундука
      entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
      entity.addComponent(Components.Chest);
      entity.addComponent(Components.OpenedSprite, { frame: 15 });
      entity.addComponent(Components.Type, { value: 'CHEST' });

      // Добавляем опыт
      entity.addComponent(Components.XP, { value: 3 });
      
      this.currentLayerEntities.push(entity);
    }
  }

  calculateTotalHappiness() {
    let total = 0;
    // Получаем сущности из карты (исключаем null)
    const entitiesWithPosition = Array.from(this.spatialMap.values()).filter(e =>
      e !== null && e.hasComponent(Components.Type)
    );
    for (const entity of entitiesWithPosition) {
        const position = entity.getComponent(Components.Position);
        const type = entity.getComponent(Components.Type).value;
        total += this.calculateActorHappiness(entity, type, position.x, position.y);
    }
    return total;
  }

  isGuardianInRightQuadrant(entity) {
    const position = entity.getComponent(Components.Position);
    const type = entity.getComponent(Components.Type).value;
    if (!position || type !== ACTOR_TYPES.GUARD) return false;

    const x = position.x;
    const y = position.y;

    if (entity.name === 'guard1') {
      return (x < 6 && y < 4);
    } else if (entity.name === 'guard2') {
      return (x > 6 && y < 4);
    } else if (entity.name === 'guard3') {
      return (x > 6 && y > 4);
    } else if (entity.name === 'guard4') {
      return (x < 6 && y > 4);
    }
    return false;
  }

  isBansheeInRightPlace(entity) {
    const position = entity.getComponent(Components.Position);
    const type = entity.getComponent(Components.Type).value;
    if (!position || type !== ACTOR_TYPES.BANSHEE) return false;

    let foundTwin = false;
    let neighborCount = 0;

    // Получаем сущности из карты (исключаем null)
    const entitiesWithPosition = Array.from(this.spatialMap.values()).filter(e =>
      e !== null && e.hasComponent(Components.Type)
    );

    for (const otherEntity of entitiesWithPosition) {
      if (otherEntity === entity) continue;

      const otherPos = otherEntity.getComponent(Components.Position);
      const dist = Phaser.Math.Distance.Between(
        position.x, position.y,
        otherPos.x, otherPos.y
      );

      if (dist <= 1 && otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.BANSHEE) {
        neighborCount++;
        if (otherEntity.name === entity.name) {
          foundTwin = true;
        }
      }
    }

    return foundTwin;
  }

  countNearMeWithSameId(entity, minDistance) {
    const position = entity.getComponent(Components.Position);
    const type = entity.getComponent(Components.Type).value;
    if (!position) return 0;

    let count = 0;
    // Используем кэш если доступен, иначе получаем из spatialMap
    const entitiesOfSameType = this.actorsByType && this.actorsByType[type] ? 
      this.actorsByType[type] : 
      Array.from(this.spatialMap.values()).filter(e =>
        e !== null && e.hasComponent(Components.Type) && e.getComponent(Components.Type).value === type
      );

    for (const otherEntity of entitiesOfSameType) {
      if (otherEntity === entity) continue;

      const otherPos = otherEntity.getComponent(Components.Position);
      const dist = Phaser.Math.Distance.Between(position.x, position.y, otherPos.x, otherPos.y);
      if (dist < minDistance) count++;
    }
    return count;
  }

  updateActorsByType() {
    // Сбрасываем кэш
    this.actorsByType = {};
    
    // Получаем все сущности с позициями из spatialMap (исключаем null)
    const entitiesWithPosition = Array.from(this.spatialMap.values()).filter(e =>
      e !== null && e.hasComponent(Components.Type)
    );
    
    // Группируем по типам
    for (const entity of entitiesWithPosition) {
      const type = entity.getComponent(Components.Type).value;
      if (!this.actorsByType[type]) {
        this.actorsByType[type] = [];
      }
      this.actorsByType[type].push(entity);
    }
  }
}