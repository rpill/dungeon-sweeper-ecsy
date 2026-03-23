import StartGame from './game/main';
import { setLangBySDK } from './game/i18n';
import { yandexGames } from './game/platform/YandexGames';

let adClosed = false;
let menuLoaded = false;

function tryGameReady() {
  if (adClosed && menuLoaded) {
    yandexGames.loadingReady();
  }
}

async function bootstrapGame() {
  try {
    await yandexGames.init();
  } catch (error) {
    console.warn('[bootstrap] SDK init failed, continuing with fallback SDK.', error);
  }

  setLangBySDK(yandexGames.getSDK());

  yandexGames.showFullscreenAd({
    onClose: () => {
      adClosed = true;
      tryGameReady();
    },
    onError: () => {
      adClosed = true;
      tryGameReady();
    },
  });

  window.onMenuReady = () => {
    menuLoaded = true;
    tryGameReady();
  };

  StartGame('game-container');

  if (import.meta.env.DEV) {
    const { registerGenerationDevTools } = await import('./game/generators/devGenerationReport');
    registerGenerationDevTools();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapGame();
});
