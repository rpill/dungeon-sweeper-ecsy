import { dataManager } from '../DataManager';
import { SCENE_KEYS } from './SceneKeys';
import { DungeonGenerator } from '../generators/DungeonGenerator';
import * as Components from '../ecs/components';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { PlayerInputSystem } from '../ecs/systems/PlayerInputSystem';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { RevealSystem } from '../ecs/systems/RevealSystem';
import { World } from 'ecsy';

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
        
        this.scene.launch(SCENE_KEYS.UI);
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

        console.log(dataManager);
    }

    restartGame() {
        this.startNewGame();

        this.scene.launch(SCENE_KEYS.UI);
    }
}