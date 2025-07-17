import * as Phaser from 'phaser';
import { SCENE_KEYS } from './scenes/SceneKeys';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Menu } from './scenes/Menu';
import { Game } from './scenes/Game';
import { UI } from './scenes/UI';
import { GameOver } from './scenes/GameOver';
import { LevelLoading } from './scenes/LevelLoading';
import { isMobile } from './utils';
import { dataManager } from './DataManager';

const CANVAS_WIDTH = 624;
const TILE_SIZE = 48;
const HUD_HEIGHT = 80;
const MIN_GAP = 12;

dataManager.tileSize = TILE_SIZE;

if (isMobile) {
    const gridHeight = dataManager.height * TILE_SIZE;
    const aspectRatio = window.innerHeight / window.innerWidth;
    var mobileHeight = Math.round(CANVAS_WIDTH * aspectRatio);
    const minHeight = HUD_HEIGHT * 2 + gridHeight + MIN_GAP * 2;
    if (mobileHeight < minHeight) {
        mobileHeight = minHeight;
    }
}

const config = {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: isMobile ? mobileHeight : 560,
    parent: 'game-container',
    backgroundColor: '#0d212a',
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

    game.scene.add(SCENE_KEYS.BOOT, Boot);
    game.scene.add(SCENE_KEYS.PRELOAD, Preload);
    game.scene.add(SCENE_KEYS.GAME, Game);
    game.scene.add(SCENE_KEYS.UI, UI);
    game.scene.add(SCENE_KEYS.MENU, Menu);
    game.scene.add(SCENE_KEYS.GAME_OVER, GameOver);
    game.scene.add(SCENE_KEYS.LEVEL_LOADING, LevelLoading);
    game.scene.start(SCENE_KEYS.BOOT);

    return game;
}

export default StartGame;