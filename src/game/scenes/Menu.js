import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class Menu extends Scene
{
    constructor ()
    {
        super({ key: SCENE_KEYS.MENU });
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x0000ff);
        
        this.add.text(512, 300, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Кнопка "Продолжить" - возврат к сохранённой игре
        const continueBtn = this.add.text(512, 400, 'Продолжить', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        continueBtn.on('pointerdown', () => {
            this.scene.resume('Game');
            this.scene.resume('HUD');
            this.scene.stop();
        });

        const newGameBtn = this.add.text(512, 460, 'Новая игра', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        newGameBtn.on('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
