import { dataManager } from '../DataManager';
import { SCENE_KEYS } from './SceneKeys';
import { DungeonGenerator } from '../generators/DungeonGenerator';
import * as Components from '../ecs/components';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { PlayerInputSystem } from '../ecs/systems/PlayerInputSystem';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { RevealSystem } from '../ecs/systems/RevealSystem';
import { World } from 'ecsy';
import { ItemActivationSystem } from '../ecs/systems/ItemActivationSystem';
import { ChestSystem } from '../ecs/systems/ChestSystem';
import { CollectSystem } from '../ecs/systems/CollectSystem';
import { LootSystem } from '../ecs/systems/LootSystem';
import { WallCombatSystem } from '../ecs/systems/WallCombatSystem';

export class Game extends Phaser.Scene {
    constructor() {
        super( { key: SCENE_KEYS.GAME } );
    }

    create() {
        console.log('Game scene create');
        this.startNewGame();
        
        this.input.keyboard.on('keydown-R', () => {
            console.log('Restarting game...');
            this.restartGame();
        });

        this.input.keyboard.on('keydown-L', () => {
            const xp = dataManager.player.nextLevelXP();
            dataManager.player.grantXP(xp);
            dataManager.player.heal();
            dataManager.player.levelUp();
        });
        
        // this.input.keyboard.on('keydown-D', () => {
        //     dataManager.debug = !dataManager.debug;
        // });
        
        this.scene.launch(SCENE_KEYS.UI);
    }

    update(time, delta) {
        this.game.ecs.world.execute(delta, time);
    }

    startNewGame() {
        // Очистка всех визуальных объектов предыдущей игры
        if (this.game.ecs && this.game.ecs.world) {
            const entities = Object.values(this.game.ecs.world.entityManager._entities);
            entities.forEach(entity => {
                if (entity.hasComponent(Components.SpriteObjects)) {
                    const spriteObjects = entity.getComponent(Components.SpriteObjects);
                    spriteObjects.destroyAll();
                }
            });
        }

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

        const dungeonGenerator = new DungeonGenerator(this.game.ecs.world);
        dungeonGenerator.generate();

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
        this.game.ecs.world.registerSystem(ItemActivationSystem);
        this.game.ecs.world.registerSystem(ChestSystem);
        this.game.ecs.world.registerSystem(CollectSystem);
        this.game.ecs.world.registerSystem(LootSystem);
        this.game.ecs.world.registerSystem(WallCombatSystem);

        // console.log(this.game.ecs.world.entityManager._entities);
        // const tiles = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Tile));
        // console.log('Клеток:', tiles.length);

        // const monsters = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Monster));
        // console.log('Монстров:', monsters.length);

        // const chests = Object.values(this.game.ecs.world.entityManager._entities).filter(e => e.hasComponent(Components.Chest));
        // console.log('Сундуков:', chests.length);
    }

    restartGame() {
        this.startNewGame();

        this.scene.launch(SCENE_KEYS.UI);
    }
}