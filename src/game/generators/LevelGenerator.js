import actorDefinitions from '../data/actor-definitions.json';
import * as Components from '../ecs/components';
import { dataManager } from '../DataManager';
import { ACTOR_TYPES, ORB_RADIUS } from '../constants/actor';
import Phaser from 'phaser';
import { StatusEvents } from '../events/EventNames';

const OPTIMIZATION_PASSES = 2;
const EMPTY_TYPE = ACTOR_TYPES.EMPTY;

const ORB_FORBIDDEN_TYPES = new Set([
  ACTOR_TYPES.DRAGON,
  ACTOR_TYPES.GAZER,
  ACTOR_TYPES.CHEST,
  ACTOR_TYPES.SPELL_MAKE_ORB,
  ACTOR_TYPES.RAT_KING,
  ACTOR_TYPES.MINE,
  ACTOR_TYPES.DRAGON_EGG,
  ACTOR_TYPES.BIG_SLIME,
  ACTOR_TYPES.MIMIC,
]);

const LAYER_PLAN = [
  [
    { type: ACTOR_TYPES.DRAGON, count: 1, opts: { revealed: true } },
    { type: ACTOR_TYPES.WIZARD, count: 1 },
  ],
  [
    { type: ACTOR_TYPES.BIG_SLIME, count: 5 },
  ],
  [
    { type: ACTOR_TYPES.MINE_KING, count: 1 },
  ],
  [
    { type: ACTOR_TYPES.GOLEM, count: 2 },
  ],
  [
    { type: ACTOR_TYPES.RAT_KING, count: 1 },
    { type: ACTOR_TYPES.WALL, count: 6 },
    { type: ACTOR_TYPES.MINOTAUR, count: 5 },
    { type: ACTOR_TYPES.GUARD, count: 4 },
    { type: ACTOR_TYPES.BANSHEE, count: 2, opts: { name: 'banshee1' } },
    { type: ACTOR_TYPES.BANSHEE, count: 2, opts: { name: 'banshee2' } },
    { type: ACTOR_TYPES.BANSHEE, count: 2, opts: { name: 'banshee3' } },
    { type: ACTOR_TYPES.BANSHEE, count: 2, opts: { name: 'banshee4' } },
    { type: ACTOR_TYPES.GAZER, count: 2 },
    { type: ACTOR_TYPES.MINE, count: 9 },
    { type: ACTOR_TYPES.MEDKIT, count: 5 },
    { kind: 'chests', count: 7 },
    { type: ACTOR_TYPES.ORB, count: 1, opts: { revealed: true } },
    { type: ACTOR_TYPES.DRAGON_EGG, count: 1 },
  ],
  [
    { type: ACTOR_TYPES.RAT, count: 13 },
    { type: ACTOR_TYPES.BAT, count: 12 },
    { type: ACTOR_TYPES.SKELETON, count: 10 },
    { type: ACTOR_TYPES.SLIME, count: 8 },
    { type: ACTOR_TYPES.MIMIC, count: 1 },
    { type: ACTOR_TYPES.BUTTERFLY, count: 1 },
    { type: ACTOR_TYPES.SPELL_MAKE_ORB, count: 1 },
  ],
];

export class LevelGenerator {
  constructor(world) {
    this.world = world;
    this.spatialMap = new Map();
    this.width = 0;
    this.height = 0;
    this.actorsByType = {};
    this.currentLayerEntities = [];
  }

  generate(options = {}) {
    const skipStatusUpdates = options.skipStatusUpdates === true;

    if (!skipStatusUpdates) {
      dataManager.setStatus(StatusEvents.GENERATING_LEVEL);
    }

    this.width = dataManager.width;
    this.height = dataManager.height;
    this.actorsByType = {};
    this.createSpatialMap();

    this.generateBaseLevel();
    this.runLayerPlan();
    this.postProcessGeneration();

    if (!skipStatusUpdates) {
      dataManager.setStatus(StatusEvents.PLAYING);
    }
  }

  createSpatialMap() {
    this.spatialMap = new Map();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.spatialMap.set(this.positionKey(x, y), null);
      }
    }
  }

  positionKey(x, y) {
    return `${x},${y}`;
  }

  runLayerPlan() {
    for (const layer of LAYER_PLAN) {
      this.beginLayer();
      for (const step of layer) {
        if (step.kind === 'chests') {
          this.addChests(step.count);
        } else {
          this.add(step.type, step.count, step.opts ?? {});
        }
      }
      this.endLayer();
    }
  }

  generateBaseLevel() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileEntity = this.world.createEntity();
        tileEntity.addComponent(Components.Position, { x, y });
        tileEntity.addComponent(Components.Tile, {
          baseType: Phaser.Math.Between(0, 4),
        });
      }
    }
  }

  beginLayer() {
    this.currentLayerEntities = [];
  }

  endLayer() {
    const layerEntities = [];
    const emptyPositions = this.collectEmptyPositions();

    Phaser.Utils.Array.Shuffle(emptyPositions);

    for (let i = 0; i < this.currentLayerEntities.length && i < emptyPositions.length; i++) {
      const entity = this.currentLayerEntities[i];
      const emptyPosition = emptyPositions[i];
      const position = entity.getComponent(Components.Position);

      position.x = emptyPosition.x;
      position.y = emptyPosition.y;
      this.spatialMap.set(this.positionKey(position.x, position.y), entity);
      layerEntities.push(entity);
    }

    this.updateActorsByType();
    let bestHappiness = this.calculateTotalHappiness();

    const tempEntities = this.createTempEmptyEntities();
    this.updateActorsByType();

    for (let pass = 0; pass < OPTIMIZATION_PASSES; pass++) {
      Phaser.Utils.Array.Shuffle(layerEntities);

      for (const entity of layerEntities) {
        if (!entity.hasComponent(Components.Position)) continue;

        let bestSwapEntity = null;
        let bestSwapHappiness = bestHappiness;

        const allEntities = this.getTypedEntitiesFromSpatialMap();
        for (const otherEntity of allEntities) {
          if (otherEntity === entity || otherEntity.fixed) continue;

          this.swapEntityPositions(entity, otherEntity);
          const newHappiness = this.calculateTotalHappiness();

          if (newHappiness > bestSwapHappiness) {
            bestSwapHappiness = newHappiness;
            bestSwapEntity = otherEntity;
          }

          this.swapEntityPositions(entity, otherEntity);
        }

        if (bestSwapEntity) {
          this.swapEntityPositions(entity, bestSwapEntity);
          bestHappiness = bestSwapHappiness;
        }
      }
    }

    this.cleanupTempEntities(tempEntities);

    for (const entity of layerEntities) {
      entity.fixed = true;
    }
  }

  collectEmptyPositions() {
    const emptyPositions = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const entity = this.spatialMap.get(this.positionKey(x, y));
        if (this.isEmptyCellEntity(entity)) {
          emptyPositions.push({ x, y });
        }
      }
    }

    return emptyPositions;
  }

  isEmptyCellEntity(entity) {
    if (entity === null) return true;
    return Boolean(entity?.isTemp && entity.getComponent(Components.Type).value === EMPTY_TYPE);
  }

  createTempEmptyEntities() {
    const tempEntities = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const positionKey = this.positionKey(x, y);
        const entity = this.spatialMap.get(positionKey);

        if (!this.isEmptyCellEntity(entity)) continue;

        const tempEntity = this.world.createEntity();
        tempEntity.addComponent(Components.Position, { x, y });
        tempEntity.addComponent(Components.Type, { value: EMPTY_TYPE });
        tempEntity.isTemp = true;

        this.spatialMap.set(positionKey, tempEntity);
        tempEntities.push(tempEntity);
      }
    }

    return tempEntities;
  }

  cleanupTempEntities(tempEntities) {
    for (const entity of tempEntities) {
      const pos = entity.getComponent(Components.Position);
      this.spatialMap.set(this.positionKey(pos.x, pos.y), null);
      entity.remove();
    }
  }

  getTypedEntitiesFromSpatialMap() {
    const entities = [];
    for (const entity of this.spatialMap.values()) {
      if (entity !== null && entity.hasComponent(Components.Type)) {
        entities.push(entity);
      }
    }
    return entities;
  }

  swapEntityPositions(entity1, entity2) {
    const pos1 = entity1.getComponent(Components.Position);
    const pos2 = entity2.getComponent(Components.Position);

    this.spatialMap.delete(this.positionKey(pos1.x, pos1.y));
    this.spatialMap.delete(this.positionKey(pos2.x, pos2.y));

    const tempX = pos1.x;
    const tempY = pos1.y;

    pos1.x = pos2.x;
    pos1.y = pos2.y;

    pos2.x = tempX;
    pos2.y = tempY;

    this.spatialMap.set(this.positionKey(pos1.x, pos1.y), entity1);
    this.spatialMap.set(this.positionKey(pos2.x, pos2.y), entity2);
  }

  add(type, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 });

      const definition = actorDefinitions[type];
      if (definition) {
        definition.forEach((compDef) => {
          const ComponentClass = Components[compDef.component];
          if (ComponentClass && compDef.component !== 'Position') {
            entity.addComponent(ComponentClass, compDef.data);
          }
        });
      }

      if (opts.name) entity.name = opts.name;
      if (opts.revealed && entity.hasComponent(Components.Sprite) && !entity.hasComponent(Components.Revealed)) {
        entity.addComponent(Components.Revealed);
      }

      this.currentLayerEntities.push(entity);
    }
  }

  findEmptyPosition() {
    const emptyPositions = this.collectEmptyPositions();
    return emptyPositions.length > 0 ? Phaser.Utils.Array.GetRandom(emptyPositions) : null;
  }

  calculateActorHappiness(entity, type, x, y) {
    let happiness = 0;
    if (type === EMPTY_TYPE || entity.isTemp) {
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
                  if (
                    otherEntity &&
                    otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.MINOTAUR &&
                    otherEntity !== entity &&
                    Phaser.Math.Distance.Between(x + dx, y + dy, x + dx + dx2, y + dy + dy2) < 2
                  ) {
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
      let forbiddenObjects = 0;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;

          const dist = Phaser.Math.Distance.Between(x, y, x + dx, y + dy);
          if (dist < ORB_RADIUS) {
            const entityAtPos = this.findEntityAtPosition(x + dx, y + dy);
            if (!entityAtPos) continue;

            const entityType = entityAtPos.getComponent(Components.Type).value;
            if (ORB_FORBIDDEN_TYPES.has(entityType)) {
              forbiddenObjects++;
            }

            if (entityType === ACTOR_TYPES.MEDKIT) {
              medkitsRevealed++;
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
    return this.spatialMap.get(this.positionKey(x, y));
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
    const entitiesWithPosition = this.getTypedEntitiesFromSpatialMap();
    const tileMap = this.buildTileMap();

    for (const entity of entitiesWithPosition) {
      const position = entity.getComponent(Components.Position);
      const type = entity.getComponent(Components.Type).value;

      if (type === ACTOR_TYPES.DRAGON || type === ACTOR_TYPES.ORB) {
        if (!entity.hasComponent(Components.Revealed)) {
          entity.addComponent(Components.Revealed);
        }

        const tileEntity = tileMap.get(this.positionKey(position.x, position.y));
        if (tileEntity && !tileEntity.hasComponent(Components.Revealed)) {
          tileEntity.addComponent(Components.Revealed);
        }
      } else if (type === ACTOR_TYPES.BANSHEE) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;

            const otherEntity = this.findEntityAtPosition(position.x + dx, position.y + dy);
            if (
              otherEntity &&
              otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.BANSHEE &&
              otherEntity.name === entity.name
            ) {
              const sprite = entity.getComponent(Components.Sprite);
              const otherSprite = otherEntity.getComponent(Components.Sprite);

              if (position.x < position.x + dx) {
                sprite.frame = 140;
                otherSprite.frame = 143;
              } else if (position.x > position.x + dx) {
                sprite.frame = 143;
                otherSprite.frame = 140;
              } else if (position.y < position.y + dy) {
                sprite.frame = 141;
                otherSprite.frame = 142;
              } else if (position.y > position.y + dy) {
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

  buildTileMap() {
    const tileMap = new Map();

    for (const entity of this.getWorldEntities()) {
      if (!entity.hasComponent(Components.Tile) || !entity.hasComponent(Components.Position)) continue;

      const position = entity.getComponent(Components.Position);
      tileMap.set(this.positionKey(position.x, position.y), entity);
    }

    return tileMap;
  }

  getWorldEntities() {
    const entities = this.world?.entityManager?._entities;
    if (!entities) return [];
    if (Array.isArray(entities)) return entities;
    if (typeof entities[Symbol.iterator] === 'function') return Array.from(entities);
    return Object.values(entities);
  }
  addChests(count) {
    const medkitChests = 2;
    const xpChests = count - medkitChests;

    for (let i = 0; i < medkitChests; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 });
      entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
      entity.addComponent(Components.Chest);
      entity.addComponent(Components.OpenedSprite, { frame: 15 });
      entity.addComponent(Components.Type, { value: ACTOR_TYPES.CHEST });
      entity.addComponent(Components.Loot, { type: ACTOR_TYPES.MEDKIT });
      this.currentLayerEntities.push(entity);
    }

    for (let i = 0; i < xpChests; i++) {
      const entity = this.world.createEntity();
      entity.addComponent(Components.Position, { x: 0, y: 0 });
      entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
      entity.addComponent(Components.Chest);
      entity.addComponent(Components.OpenedSprite, { frame: 15 });
      entity.addComponent(Components.Type, { value: ACTOR_TYPES.CHEST });
      entity.addComponent(Components.XP, { value: 3 });
      this.currentLayerEntities.push(entity);
    }
  }

  calculateTotalHappiness() {
    let total = 0;
    const entitiesWithPosition = this.getTypedEntitiesFromSpatialMap();

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
      return x < 6 && y < 4;
    } else if (entity.name === 'guard2') {
      return x > 6 && y < 4;
    } else if (entity.name === 'guard3') {
      return x > 6 && y > 4;
    } else if (entity.name === 'guard4') {
      return x < 6 && y > 4;
    }
    return false;
  }

  isBansheeInRightPlace(entity) {
    const position = entity.getComponent(Components.Position);
    const type = entity.getComponent(Components.Type).value;
    if (!position || type !== ACTOR_TYPES.BANSHEE) return false;

    const entitiesWithPosition = this.getTypedEntitiesFromSpatialMap();
    for (const otherEntity of entitiesWithPosition) {
      if (otherEntity === entity) continue;

      const otherPos = otherEntity.getComponent(Components.Position);
      const dist = Phaser.Math.Distance.Between(position.x, position.y, otherPos.x, otherPos.y);

      if (dist <= 1 && otherEntity.getComponent(Components.Type).value === ACTOR_TYPES.BANSHEE) {
        if (otherEntity.name === entity.name) {
          return true;
        }
      }
    }

    return false;
  }

  countNearMeWithSameId(entity, minDistance) {
    const position = entity.getComponent(Components.Position);
    const type = entity.getComponent(Components.Type).value;
    if (!position) return 0;

    let count = 0;
    const entitiesOfSameType =
      this.actorsByType && this.actorsByType[type]
        ? this.actorsByType[type]
        : this.getTypedEntitiesFromSpatialMap().filter(
            (typedEntity) => typedEntity.getComponent(Components.Type).value === type
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
    this.actorsByType = {};
    const entitiesWithPosition = this.getTypedEntitiesFromSpatialMap();

    for (const entity of entitiesWithPosition) {
      const type = entity.getComponent(Components.Type).value;
      if (!this.actorsByType[type]) {
        this.actorsByType[type] = [];
      }
      this.actorsByType[type].push(entity);
    }
  }
}

