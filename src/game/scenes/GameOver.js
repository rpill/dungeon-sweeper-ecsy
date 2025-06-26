import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class GameOver extends Scene {
    constructor () {
        super({ key: SCENE_KEYS.GAME_OVER });
    }

    create () {
        this.cameras.main.setBackgroundColor(0xff0000);

        this.add.text(512, 384, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {

            this.scene.start('MainMenu');

        });
    }
}
