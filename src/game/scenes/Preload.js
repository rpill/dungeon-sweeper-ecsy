import * as Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys';

export class Preload extends Phaser.Scene
{
	constructor () {
		super({
			key: SCENE_KEYS.PRELOAD,
		});
	}

	init () {
		this.add.image(512, 384, 'background');
		this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
		const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);
		this.load.on('progress', (progress) => {
			bar.width = 4 + (460 * progress);
		});
	}

	preload () {
		this.load.setPath('assets');

		this.load.image('hud', 'images/hud.png');
		this.load.spritesheet('tiles', 'images/tiles.png', { frameWidth: 48, frameHeight: 48 });
		this.load.spritesheet('monsters', 'images/monsters.png', { frameWidth: 48, frameHeight: 48 });
		this.load.image('hero_frame', 'images/hero_frame.png');
		this.load.spritesheet('hero', 'images/hero.png', { frameWidth: 48, frameHeight: 48 });
		this.load.spritesheet('icons', 'images/icons.png', { frameWidth: 48, frameHeight: 48 });
		this.load.spritesheet('fx_impact', 'images/uf_FX_impact.png', { frameWidth: 48, frameHeight: 48 });
		this.load.spritesheet('fx', 'images/uf_FX.png', { frameWidth: 24, frameHeight: 24 });

		this.load.bitmapFont('ingame', 'fonts/ingame.png', 'fonts/ingame.xml');
		this.load.bitmapFont('ui', 'fonts/quinque-five.png', 'fonts/quinque-five.xml');
	}

	create () {
		this.#createAnimations();
		this.scene.start(SCENE_KEYS.GAME);
	}

	#createAnimations() {
		this.anims.create({
            key: 'hit',
            frames: this.anims.generateFrameNumbers('fx_impact', { start: 3, end: 5 }),
            frameRate: 10,
            hideOnComplete: true
        });

        this.anims.create({
            key: 'butterfly_miss',
            frames: this.anims.generateFrameNumbers('monsters', { start: 134, end: 136 }),
            frameRate: 10,
            hideOnComplete: true
        });

        this.anims.create({
            key: 'spell_reveal',
            frames: this.anims.generateFrameNumbers('fx_impact', { start: 24, end: 28 }),
            frameRate: 10,
            repeat: 0,
            yoyo: true,
        });

        this.anims.create({
            key: 'explosion',
            frames: this.anims.generateFrameNumbers('fx_impact', { start: 20, end: 23 }),
            frameRate: 10,
            repeat: 0,
        });

        this.anims.create({
            key: 'key_anim',
            frames: this.anims.generateFrameNumbers('icons', { frames: [3, 7] }), // Указываем конкретные кадры
            frameRate: 5,
            repeat: -1 // Бесконечное повторение
        });
	}
}
