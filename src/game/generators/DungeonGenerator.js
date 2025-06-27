// src/game/generators/DungeonGenerator.js

import actorDefinitions from '../data/actor-definitions.json';
import * as Components from '../ecs/components';
import { dataManager } from '../DataManager';
import { ACTOR_TYPES } from '../constants/actor';
import Phaser from 'phaser';
import { StatusEvents } from '../events/EventNames';

export class DungeonGenerator {
    constructor(world) {
        this.world = world;
    }

    generate() {
        dataManager.setStatus(StatusEvents.GENERATING_DUNGEON);

        const { width, height } = dataManager;

        // 1. Создаём плитки
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileEntity = this.world.createEntity();
                tileEntity.addComponent(Components.Position, { x, y });
                tileEntity.addComponent(Components.Tile, {
                    baseType: Phaser.Math.Between(0, 4)
                });
            }
        }

        // 2. Генерация акторов в нужном количестве и с нужными именами
        this.add(ACTOR_TYPES.DRAGON, 1, { revealed: true });
        this.add(ACTOR_TYPES.WIZARD, 1);
        this.add(ACTOR_TYPES.BIG_SLIME, 5);
        this.add(ACTOR_TYPES.MINE_KING, 1);
        this.add(ACTOR_TYPES.GOLEM, 2);
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
        this.add(ACTOR_TYPES.RAT, 13);
        this.add(ACTOR_TYPES.BAT, 12);
        this.add(ACTOR_TYPES.SKELETON, 10);
        this.add(ACTOR_TYPES.SLIME, 8);
        this.add(ACTOR_TYPES.MIMIC, 1);
        this.add(ACTOR_TYPES.BUTTERFLY, 1);
        this.add(ACTOR_TYPES.SPELL_MAKE_ORB, 1);


        dataManager.setStatus(StatusEvents.PLAYING);
    }

    add(type, count, opts = {}) {
        for (let i = 0; i < count; i++) {
            const position = this.findEmptyPosition();
            if (!position) break;
            const entity = this.world.createEntity();
            entity.addComponent(Components.Position, { x: position.x, y: position.y });
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
        }
    }

    findEmptyPosition() {
        const { width, height } = dataManager;
        const actorPositions = new Set();
        const actors = Object.values(this.world.entityManager._entities).filter(entity =>
            entity.hasComponent(Components.Position) && entity.hasComponent(Components.Sprite)
        );
        actors.forEach(actor => {
            const pos = actor.getComponent(Components.Position);
            actorPositions.add(`${pos.x},${pos.y}`);
        });

        const emptyPositions = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!actorPositions.has(`${x},${y}`)) {
                    emptyPositions.push({ x, y });
                }
            }
        }
        if (emptyPositions.length === 0) return null;
        return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
    }

    addChests(count) {
        const medkitChests = 2; // 2 сундука с медкитом
        const xpChests = count - medkitChests; // остальные с опытом
        
        // Создаем сундуки с медкитом
        for (let i = 0; i < medkitChests; i++) {
            const position = this.findEmptyPosition();
            if (!position) break;
            const entity = this.world.createEntity();
            entity.addComponent(Components.Position, { x: position.x, y: position.y });
            
            // Добавляем базовые компоненты сундука
            entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
            entity.addComponent(Components.Chest);
            entity.addComponent(Components.OpenedSprite, { frame: 15 });
            entity.addComponent(Components.Type, { value: 'CHEST' });
            
            // Добавляем медкит как лут
            entity.addComponent(Components.Loot, { type: 'MEDKIT' });
        }
        
        // Создаем сундуки с опытом
        for (let i = 0; i < xpChests; i++) {
            const position = this.findEmptyPosition();
            if (!position) break;
            const entity = this.world.createEntity();
            entity.addComponent(Components.Position, { x: position.x, y: position.y });
            
            // Добавляем базовые компоненты сундука
            entity.addComponent(Components.Sprite, { spriteSheet: 'icons', frame: 14 });
            entity.addComponent(Components.Chest);
            entity.addComponent(Components.OpenedSprite, { frame: 15 });
            entity.addComponent(Components.Type, { value: 'CHEST' });
            
            // Добавляем опыт
            entity.addComponent(Components.XP, { value: 3 });
        }
    }
}