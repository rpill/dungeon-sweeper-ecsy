import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scenes/SceneKeys';
import { Preload } from './scenes/Preload';
import { Menu } from './scenes/Menu';
import { Game } from './scenes/Game';
import { UI } from './scenes/UI';
import { GameOver } from './scenes/GameOver';

const config = {
    type: Phaser.AUTO,
    width: 624,
    height: 560,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
};

const StartGame = (parent) => {
    const game = new Phaser.Game({ ...config, parent });

    game.scene.add(SCENE_KEYS.PRELOAD, Preload);
    game.scene.add(SCENE_KEYS.MENU, Menu);
    game.scene.add(SCENE_KEYS.GAME, Game);
    game.scene.add(SCENE_KEYS.UI, UI);
    game.scene.add(SCENE_KEYS.GAME_OVER, GameOver);
    game.scene.start(SCENE_KEYS.PRELOAD);

    return game;
}

export default StartGame;