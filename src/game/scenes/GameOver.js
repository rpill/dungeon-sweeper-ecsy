import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { AudioEvents } from '../events/EventNames';
import { sceneEvents } from '../events/EventsCenter';
import { audioManager } from '../AudioManager';
import { t } from '../i18n';
import { dataManager } from '../DataManager';
import { yandexGames } from '../platform/YandexGames';

export class GameOver extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const pad = Phaser.Utils.String.Pad;
      if (h > 0) {
        return `${pad(h, 2, '0', 1)}:${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      } else {
        return `${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      }
    }

    // Р¤РѕРЅ РјРµРЅСЋ
    this.add.image(centerX, centerY, 'menu_background');

    const bgColor = data.win ? 0x445f41 : 0xa04f4f;
    // РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ Р·Р°С‚РµРјРЅСЏСЋС‰РёР№ С„РѕРЅ
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, bgColor, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    let offsetY = -60;
    if (data.win) {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('win'), 20).setOrigin(0.5).setTint(0xffffff);
    } else {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('lose'), 20).setOrigin(0.5).setTint(0xffffff);
    }
    offsetY += 60;
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `${t('time')}: ${formatTime(data.time)}`, 18).setOrigin(0.5).setTint(0xffffff);
    offsetY += 30;
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `${t('score')}: ${data.score}`, 18).setOrigin(0.5).setTint(0xffffff);
    offsetY += 70;

    // --- Р›РёРґРµСЂР±РѕСЂРґС‹ ---
    if (yandexGames.sdk && yandexGames.sdk.getPlayer && yandexGames.sdk.leaderboards) {
      yandexGames.sdk.getPlayer().then(player => {
        if (player.isAuthorized && player.isAuthorized()) {
          // BestTime: С‚РѕР»СЊРєРѕ РµСЃР»Рё РїРѕР±РµРґР°
          if (data.win) {
            // РџРѕР»СѓС‡Р°РµРј С‚РµРєСѓС‰РµРµ Р»СѓС‡С€РµРµ РІСЂРµРјСЏ РёРіСЂРѕРєР°
            yandexGames.sdk.leaderboards.getPlayerEntry('BestTime').then(entry => {
              const prevBest = entry && typeof entry.score === 'number' ? entry.score : null;
              const newTime = data.time * 1000; // РїРµСЂРµРІРѕРґРёРј РІ РјРёР»Р»РёСЃРµРєСѓРЅРґС‹
              // Р•СЃР»Рё РЅРµС‚ РїСЂРµРґС‹РґСѓС‰РµРіРѕ СЂРµР·СѓР»СЊС‚Р°С‚Р° РёР»Рё РЅРѕРІРѕРµ РІСЂРµРјСЏ Р»СѓС‡С€Рµ вЂ” РѕС‚РїСЂР°РІР»СЏРµРј
              if (prevBest === null || newTime < prevBest) {
                yandexGames.sdk.leaderboards.setScore('BestTime', newTime)
                  .then(() => {
                    // РћС‚РїСЂР°РІР»СЏРµРј TotalScore РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕРіРѕ СЃРѕС…СЂР°РЅРµРЅРёСЏ BestTime
                    setTimeout(() => {
                      this.sendTotalScore(data.score);
                    }, 1100); // Р·Р°РґРµСЂР¶РєР° С‡СѓС‚СЊ Р±РѕР»СЊС€Рµ 1 СЃРµРєСѓРЅРґС‹
                  })
                  .catch((err) => console.error('BestTime save error:', err));
              } else {
                // РћС‚РїСЂР°РІР»СЏРµРј TotalScore СЃСЂР°Р·Сѓ, РµСЃР»Рё BestTime РЅРµ РѕР±РЅРѕРІР»СЏР»СЃСЏ
                this.sendTotalScore(data.score);
              }
            }).catch((err) => {
              // Р•СЃР»Рё РЅРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РїСЂРµРґС‹РґСѓС‰РµРµ РІСЂРµРјСЏ вЂ” РїСЂРѕСЃС‚Рѕ РѕС‚РїСЂР°РІР»СЏРµРј
              yandexGames.sdk.leaderboards.setScore('BestTime', data.time * 1000)
                .then(() => {
                  // РћС‚РїСЂР°РІР»СЏРµРј TotalScore РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕРіРѕ СЃРѕС…СЂР°РЅРµРЅРёСЏ BestTime
                  setTimeout(() => {
                    this.sendTotalScore(data.score);
                  }, 1100);
                })
                .catch((err) => console.error('BestTime save error:', err));
            });
          } else {
            // Р•СЃР»Рё РЅРµ РїРѕР±РµРґР°, РѕС‚РїСЂР°РІР»СЏРµРј С‚РѕР»СЊРєРѕ TotalScore
            this.sendTotalScore(data.score);
          }
        }
      });
    }
    // --- РєРѕРЅРµС† Р»РёРґРµСЂР±РѕСЂРґРѕРІ ---

    // --- Р›РѕРєР°Р»СЊРЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ РґР»СЏ РЅРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹С… ---
    if (yandexGames.sdk && yandexGames.sdk.getPlayer) {
      yandexGames.sdk.getPlayer().then(player => {
        if (!player.isAuthorized || !player.isAuthorized()) {
          // РЎРѕС…СЂР°РЅСЏРµРј Р»СѓС‡С€РёР№ СЂРµР·СѓР»СЊС‚Р°С‚ (BestTime) С‚РѕР»СЊРєРѕ РµСЃР»Рё РїРѕР±РµРґР°
          if (data.win) {
            const prevBest = Number(localStorage.getItem('bestTime') || 0);
            const newTime = data.time * 1000;
            if (!prevBest || newTime < prevBest) {
              localStorage.setItem('bestTime', newTime);
            }
          }
          // РЎРѕС…СЂР°РЅСЏРµРј РѕР±С‰РёР№ СЃС‡РµС‚ (TotalScore)
          const prevScore = Number(localStorage.getItem('totalScore') || 0);
          localStorage.setItem('totalScore', prevScore + data.score);
        }
      });
    }

    // --- РџРѕРєР°Р·С‹РІР°РµРј РЅР°РїРѕРјРёРЅР°РЅРёРµ РѕР± РѕС‚Р·С‹РІРµ ---
    if (yandexGames.sdk && yandexGames.sdk.feedback) {
      if (dataManager.getGamesPlayed() === 5) {
        yandexGames.sdk.feedback.canReview()
          .then(({ value, reason }) => {
            if (value) {
              yandexGames.sdk.feedback.requestReview()
                .then(({ feedbackSent }) => {
                  if (feedbackSent) {
                    // РњРѕР¶РЅРѕ РїРѕРєР°Р·Р°С‚СЊ Р±Р»Р°РіРѕРґР°СЂРЅРѕСЃС‚СЊ РёР»Рё Р°РЅРёРјР°С†РёСЋ
                    console.log('РЎРїР°СЃРёР±Рѕ Р·Р° РІР°С€Сѓ РѕС†РµРЅРєСѓ!');
                  } else {
                    console.log('РћРєРЅРѕ РѕС†РµРЅРєРё Р·Р°РєСЂС‹С‚Рѕ Р±РµР· РѕС†РµРЅРєРё');
                  }
                });
            } else {
              console.log('РћС†РµРЅРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°:', reason);
            }
          });
      }
    }
    // РљРЅРѕРїРєР° "Р’ РјРµРЅСЋ"
    const menuBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('menu'), 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
        // РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕ РѕСЃС‚Р°РЅР°РІР»РёРІР°РµРј РјСѓР·С‹РєСѓ РїРѕР±РµРґС‹
        audioManager.forceStopWinMusic();
        
        // Р—Р°РїСѓСЃРєР°РµРј РѕР±С‹С‡РЅСѓСЋ РјСѓР·С‹РєСѓ РµСЃР»Рё РѕРЅР° РЅРµ РёРіСЂР°РµС‚
        if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
          audioManager.playMusic();
        }
        
        this.scene.start(SCENE_KEYS.MENU);
      });
  }

  // РњРµС‚РѕРґ РґР»СЏ РѕС‚РїСЂР°РІРєРё TotalScore
  sendTotalScore(score) {
    yandexGames.sdk.leaderboards.getPlayerEntry('TotalScore')
      .then(entry => {
        const prev = entry && typeof entry.score === 'number' ? entry.score : 0;
        const newTotal = prev + score;
        yandexGames.sdk.leaderboards.setScore('TotalScore', newTotal)
          .catch((err) => console.error('TotalScore save error:', err));
      })
      .catch((err) => {
        yandexGames.sdk.leaderboards.setScore('TotalScore', score)
          .catch((err) => console.error('TotalScore save error:', err));
      });
  }
}

