import StartGame from './game/main';
import { setLangBySDK } from './game/i18n';

let ysdk = null;
let adClosed = false;
let menuLoaded = false;

function tryGameReady() {
  if (adClosed && menuLoaded) {
    window.ysdk.features.LoadingAPI?.ready();
  }
}

function initSDK() {
  if (window.YaGames) {
    window.YaGames.init().then(sdk => {
      ysdk = sdk;
      window.ysdk = sdk;
      setLangBySDK(sdk);
      // Показываем рекламу
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: () => {
            adClosed = true;
            tryGameReady();
          },
          onError: () => {
            adClosed = true;
            tryGameReady();
          }
        }
      });

      // Глобальный колбэк для меню
      window.onMenuReady = () => {
        menuLoaded = true;
        tryGameReady();
      };

      StartGame('game-container');
    });
  } else {
    setTimeout(initSDK, 50);
  }
}

document.addEventListener('DOMContentLoaded', initSDK);